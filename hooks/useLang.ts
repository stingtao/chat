'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { appendLangToHref, Lang, normalizeLang } from '@/lib/i18n';

export function useLang(): Lang {
  const searchParams = useSearchParams();
  return normalizeLang(searchParams.get('lang'));
}

export function useLangHref() {
  const lang = useLang();
  return useCallback((href: string) => appendLangToHref(href, lang), [lang]);
}
