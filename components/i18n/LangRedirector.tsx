'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { detectLangFromNavigator, normalizeLang } from '@/lib/i18n';

export default function LangRedirector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const current = searchParams.get('lang');
    const normalized = normalizeLang(current);
    const shouldDetect = !current;
    const desired = shouldDetect ? detectLangFromNavigator() : normalized;

    document.documentElement.lang = desired;

    if (!current || current !== desired) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('lang', desired);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  return null;
}
