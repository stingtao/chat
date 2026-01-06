import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { GoogleOAuth, verifyState, mergeAuthProviders } from '@/lib/oauth';
import { generateToken } from '@/lib/auth';
import { normalizeLang } from '@/lib/i18n';

/**
 * GET /api/auth/google/callback?code=...&state=...
 * Handles Google OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user cancelled, etc.)
    if (error) {
      return redirectToLoginWithError(
        error === 'access_denied'
          ? 'Google login was cancelled'
          : 'Google login failed',
        'host' // Default to host, will be overridden if state is available
      );
    }

    if (!code || !stateParam) {
      return redirectToLoginWithError('Invalid OAuth response', 'host');
    }

    // Verify state (CSRF protection)
    const cookieState = request.cookies.get('oauth_state')?.value;
    if (!cookieState) {
      return redirectToLoginWithError('Session expired. Please try again.', 'host');
    }

    // Extract user type from state
    const [state, userType, langParam] = stateParam.split(':') as [string, 'host' | 'client', string?];
    const lang = langParam ? normalizeLang(langParam) : undefined;

    if (!verifyState(state, cookieState)) {
      return redirectToLoginWithError('Invalid request. Please try again.', userType, lang);
    }

    // Exchange code for access token
    const accessToken = await GoogleOAuth.exchangeCodeForToken(code);

    // Get user profile
    const profile = await GoogleOAuth.getUserProfile(accessToken);

    if (!profile.email) {
      return redirectToLoginWithError('Email not provided by Google', userType);
    }

    // Handle Host vs Client
    let user;
    let token;

    if (userType === 'host') {
      // Check if host exists with this email
      let host = await prisma.host.findUnique({
        where: { email: profile.email },
      });

      if (host) {
        // Link Google account if not already linked
        if (!host.googleId) {
          host = await prisma.host.update({
            where: { id: host.id },
            data: {
              googleId: profile.id,
              authProvider: mergeAuthProviders(host.authProvider, 'google'),
              avatar: host.avatar || profile.picture, // Only update if no avatar
            },
          });
        }
      } else {
        // Create new host
        host = await prisma.host.create({
          data: {
            email: profile.email,
            googleId: profile.id,
            name: profile.name,
            avatar: profile.picture,
            authProvider: 'google',
            password: null, // No password for OAuth users
          },
        });
      }

      // Generate JWT
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
      // Client user flow
      let client = await prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (client) {
        // Link Google account if not already linked
        if (!client.googleId) {
          client = await prisma.user.update({
            where: { id: client.id },
            data: {
              googleId: profile.id,
              authProvider: mergeAuthProviders(client.authProvider, 'google'),
              avatar: client.avatar || profile.picture,
            },
          });
        }
      } else {
        // Create new client user
        // Generate username from email
        const username = profile.email.split('@')[0] + Math.random().toString(36).substring(2, 6);

        client = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.id,
            username,
            avatar: profile.picture,
            authProvider: 'google',
            password: null,
          },
        });
      }

      // Generate JWT
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

    // Redirect to frontend with token
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

    // Clear state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return redirectToLoginWithError('Google login failed. Please try again.', 'host');
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
