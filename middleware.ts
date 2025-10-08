import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale
  const pathnameHasLocale = [
    'pt', 'en', 'es'
  ].some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    // Get the preferred locale
    const locale = getPreferredLocale(request);
    
    // Redirect to the localized version
    const redirectUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

function getPreferredLocale(request: NextRequest): string {
  // Check for explicit locale preference in cookies
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && ['pt', 'en', 'es'].includes(localeCookie)) {
    return localeCookie;
  }

  // Check Accept-Language header for Portuguese
  const acceptLanguage = request.headers.get('accept-language') || '';
  
  if (acceptLanguage.includes('pt-BR') || acceptLanguage.includes('pt')) {
    return 'pt';
  }
  
  if (acceptLanguage.includes('es')) {
    return 'es';
  }
  
  if (acceptLanguage.includes('en')) {
    return 'en';
  }

  // Check for country-based detection
  const country = request.headers.get('cf-ipcountry') || 
                 request.headers.get('x-vercel-ip-country') ||
                 request.headers.get('x-forwarded-for');
  
  if (country === 'BR') {
    return 'pt';
  }

  // Default to Portuguese
  return 'pt';
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};