'use client';

import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { useLang, useLangHref } from "@/hooks/useLang";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href={withLang("/")} className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">chat</span>
            </Link>
            <p className="text-gray-600 mb-4 max-w-sm">
              {t.footer.description}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {t.footer.product}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href={withLang("/#features")} className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.features}
                </Link>
              </li>
              <li>
                <Link href={withLang("/host/login")} className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.forHosts}
                </Link>
              </li>
              <li>
                <Link href={withLang("/client/login")} className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.forUsers}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              {t.footer.company}
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.about}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  {t.footer.terms}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            {t.footer.copyright(currentYear)}
          </p>
        </div>
      </div>
    </footer>
  );
}
