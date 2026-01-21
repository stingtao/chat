import { NextRequest, NextResponse } from 'next/server';
import { LineOAuth, generateState } from '@/lib/oauth';
import { normalizeLang } from '@/lib/i18n';

export const runtime = 'edge';

/**
 * GET /api/auth/line?type=host|client
 * Initiates LINE OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userType = searchParams.get('type') as 'host' | 'client';
    const langParam = searchParams.get('lang');
    const lang = normalizeLang(langParam);

    if (!userType || !['host', 'client'].includes(userType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user type' },
        { status: 400 }
      );
    }

    // Generate state for CSRF protection
    const state = generateState();

    // Get LINE OAuth authorization URL
    const authUrl = LineOAuth.getAuthUrl(state, userType, langParam ? lang : undefined);

    // Store state in cookie for verification in callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('LINE OAuth initiate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate LINE login' },
      { status: 500 }
    );
  }
}
