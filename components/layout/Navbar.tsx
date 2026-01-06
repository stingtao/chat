'use client';

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LANG_LABELS, Lang, getTranslations } from "@/lib/i18n";
import { useLang, useLangHref } from "@/hooks/useLang";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

  const handleLangChange = (nextLang: Lang) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', nextLang);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    router.push(`${pathname}?${params.toString()}${hash}`);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href={withLang("/")} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">chat</span>
          </Link>

          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden sm:inline">
                {t.language.label}
              </span>
              <select
                value={lang}
                onChange={(event) => handleLangChange(event.target.value as Lang)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t.language.label}
              >
                {Object.entries(LANG_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Link
              href={withLang("/host/login")}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t.navbar.forHosts}
            </Link>
            <Link
              href={withLang("/client/login")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t.navbar.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
