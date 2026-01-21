export interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Generate random state for CSRF protection
 */
export function generateState(): string {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    throw new Error('Crypto not available');
  }
  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify state parameter matches expected value
 */
export function verifyState(receivedState: string, expectedState: string): boolean {
  return receivedState === expectedState;
}

/**
 * Google OAuth utilities
 */
export const GoogleOAuth = {
  /**
   * Generate Google OAuth authorization URL
   */
  getAuthUrl(state: string, userType: 'host' | 'client', lang?: string): string {
    const stateValue = lang ? `${state}:${userType}:${lang}` : `${state}:${userType}`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      state: stateValue, // Embed user type and language in state
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
  },

  /**
   * Fetch user profile from Google
   */
  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  },
};

/**
 * LINE OAuth utilities
 */
export const LineOAuth = {
  /**
   * Generate LINE OAuth authorization URL
   */
  getAuthUrl(state: string, userType: 'host' | 'client', lang?: string): string {
    const stateValue = lang ? `${state}:${userType}:${lang}` : `${state}:${userType}`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINE_CHANNEL_ID!,
      redirect_uri: process.env.LINE_REDIRECT_URI!,
      state: stateValue, // Embed user type and language in state
      scope: 'profile openid email',
    });
    return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  },

  /**
   * Exchange authorization code for access token and ID token
   */
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; idToken: string }> {
    const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINE_REDIRECT_URI!,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      idToken: data.id_token,
    };
  },

  /**
   * Fetch user profile from LINE
   */
  async getUserProfile(accessToken: string): Promise<Omit<OAuthProfile, 'email'>> {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LINE profile');
    }

    const data = await response.json();

    return {
      id: data.userId,
      name: data.displayName,
      picture: data.pictureUrl,
    };
  },

  /**
   * Verify ID token and extract email
   */
  async getEmailFromIdToken(idToken: string): Promise<string> {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: process.env.LINE_CHANNEL_ID!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify ID token');
    }

    const data = await response.json();
    return data.email;
  },
};

/**
 * Helper to merge auth providers (e.g., "email" + "google" = "email,google")
 */
export function mergeAuthProviders(existing: string, newProvider: 'google' | 'line'): string {
  const providers = existing.split(',').filter(p => p);
  if (!providers.includes(newProvider)) {
    providers.push(newProvider);
  }
  return providers.join(',');
}
