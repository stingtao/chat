import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { LineOAuth, verifyState, mergeAuthProviders } from '@/lib/oauth';
import { generateToken } from '@/lib/auth';
import { normalizeLang } from '@/lib/i18n';

/**
 * GET /api/auth/line/callback?code=...&state=...
 * Handles LINE OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      return redirectToLoginWithError(
        error === 'access_denied'
          ? 'LINE login was cancelled'
          : 'LINE login failed',
        'host'
      );
    }

    if (!code || !stateParam) {
      return redirectToLoginWithError('Invalid OAuth response', 'host');
    }

    // Verify state
    const cookieState = request.cookies.get('oauth_state')?.value;
    if (!cookieState) {
      return redirectToLoginWithError('Session expired. Please try again.', 'host');
    }

    const [state, userType, langParam] = stateParam.split(':') as [string, 'host' | 'client', string?];
    const lang = langParam ? normalizeLang(langParam) : undefined;

    if (!verifyState(state, cookieState)) {
      return redirectToLoginWithError('Invalid request. Please try again.', userType, lang);
    }

    // Exchange code for tokens
    const { accessToken, idToken } = await LineOAuth.exchangeCodeForTokens(code);

    // Get user profile
    const profile = await LineOAuth.getUserProfile(accessToken);

    // Get email from ID token
    const email = await LineOAuth.getEmailFromIdToken(idToken);

    if (!email) {
      return redirectToLoginWithError('Email not provided by LINE', userType);
    }

    // Handle Host vs Client
    let user;
    let token;

    if (userType === 'host') {
      let host = await prisma.host.findUnique({
        where: { email },
      });

      if (host) {
        if (!host.lineId) {
          host = await prisma.host.update({
            where: { id: host.id },
            data: {
              lineId: profile.id,
              authProvider: mergeAuthProviders(host.authProvider, 'line'),
              avatar: host.avatar || profile.picture,
            },
          });
        }
      } else {
        host = await prisma.host.create({
          data: {
            email,
            lineId: profile.id,
            name: profile.name,
            avatar: profile.picture,
            authProvider: 'line',
            password: null,
          },
        });
      }

      token = await generateToken({
        userId: host.id,
        email: host.email,
        type: 'host',
      });

      user = {
        id: host.id,
        email: host.email,
        name: host.name,
        avatar: host.avatar,
      };
    } else {
      let client = await prisma.user.findUnique({
        where: { email },
      });

      if (client) {
        if (!client.lineId) {
          client = await prisma.user.update({
            where: { id: client.id },
            data: {
              lineId: profile.id,
              authProvider: mergeAuthProviders(client.authProvider, 'line'),
              avatar: client.avatar || profile.picture,
            },
          });
        }
      } else {
        const username = email.split('@')[0] + Math.random().toString(36).substring(2, 6);

        client = await prisma.user.create({
          data: {
            email,
            lineId: profile.id,
            username,
            avatar: profile.picture,
            authProvider: 'line',
            password: null,
          },
        });
      }

      token = await generateToken({
        userId: client.id,
        email: client.email,
        type: 'client',
      });

      user = {
        id: client.id,
        email: client.email,
        username: client.username,
        avatar: client.avatar,
      };
    }

    const redirectUrl = userType === 'host' ? '/host/dashboard' : '/client/chat';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const redirectParams = new URLSearchParams({
      token,
      user: JSON.stringify(user),
    });
    if (lang) {
      redirectParams.set('lang', lang);
    }
    const response = NextResponse.redirect(
      `${appUrl}${redirectUrl}?${redirectParams.toString()}`
    );

    response.cookies.delete('oauth_state');
    return response;
  } catch (error) {
    console.error('LINE OAuth callback error:', error);
    return redirectToLoginWithError('LINE login failed. Please try again.', 'host');
  }
}

function redirectToLoginWithError(
  errorMessage: string,
  userType: 'host' | 'client',
  lang?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const loginPath = userType === 'host' ? '/host/login' : '/client/login';
  const params = new URLSearchParams({ error: errorMessage });
  if (lang) {
    params.set('lang', normalizeLang(lang));
  }
  return NextResponse.redirect(`${appUrl}${loginPath}?${params.toString()}`);
}
