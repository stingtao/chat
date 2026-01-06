import { NextRequest, NextResponse } from 'next/server';
import { detectLangFromAcceptLanguage, normalizeLang } from '@/lib/i18n';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const langParam = searchParams.get('lang');
  const normalized = normalizeLang(langParam);

  if (!langParam || langParam !== normalized) {
    const detected = langParam ? normalized : detectLangFromAcceptLanguage(request.headers.get('accept-language'));
    const url = request.nextUrl.clone();
    url.searchParams.set('lang', detected);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
};
