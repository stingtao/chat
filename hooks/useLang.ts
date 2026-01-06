'use client';

import { useSearchParams } from 'next/navigation';
import { appendLangToHref, Lang, normalizeLang } from '@/lib/i18n';

export function useLang(): Lang {
  const searchParams = useSearchParams();
  return normalizeLang(searchParams.get('lang'));
}

export function useLangHref() {
  const lang = useLang();
  return (href: string) => appendLangToHref(href, lang);
}
