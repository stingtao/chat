'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateEmail, validatePassword } from '@/lib/utils';
import OAuthButtons from '@/components/OAuthButtons';
import { appendLangToHref, getTranslations } from '@/lib/i18n';
import { useLang, useLangHref } from '@/hooks/useLang';

export default function HostLoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Handle OAuth redirect with token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    const errorParam = params.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean URL
      window.history.replaceState({}, '', appendLangToHref(window.location.pathname, lang));
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userType', 'host');

        // Redirect to dashboard
        router.push(appendLangToHref('/host/dashboard', lang));
      } catch (err) {
        setError(t.auth.common.loginFailed);
        window.history.replaceState({}, '', appendLangToHref(window.location.pathname, lang));
      }
    }
  }, [lang, router, t.auth.common.loginFailed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validateEmail(email)) {
      setError(t.auth.common.invalidEmail);
      return;
    }

    if (!isLogin) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        setError(passwordValidation.error || t.auth.common.invalidPassword);
        return;
      }

      if (!name.trim()) {
        setError(t.auth.common.nameRequired);
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/host/login' : '/api/host/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(isLogin ? {} : { name }),
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Store token and user info
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('userType', 'host');

        // Redirect to dashboard
        router.push(withLang('/host/dashboard'));
      } else {
        setError(data.error || t.auth.common.authFailed);
      }
    } catch (err) {
      setError(t.auth.common.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setError('');
    setLoading(true);

    // Array of demo host accounts
    const demoAccounts = [
      { email: 'demo@host.com', password: 'Demo123456', name: 'Demo Host' },
      { email: 'demo2@host.com', password: 'Demo123456', name: 'Demo Host 2' },
      { email: 'demo3@host.com', password: 'Demo123456', name: 'Demo Host 3' },
    ];

    // Randomly select one demo account
    const randomAccount = demoAccounts[Math.floor(Math.random() * demoAccounts.length)];
    console.log('Selected demo account:', randomAccount.email);

    try {
      // Try to login first
      let response = await fetch('/api/host/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: randomAccount.email,
          password: randomAccount.password,
        }),
      });

      let data = await response.json();

      // If login fails, try to register
      if (!data.success) {
        response = await fetch('/api/host/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: randomAccount.email,
            password: randomAccount.password,
            name: randomAccount.name,
          }),
        });

        data = await response.json();
      }

      if (data.success && data.data) {
        // Store token and user info
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('userType', 'host');

        // Redirect to dashboard
        router.push(withLang('/host/dashboard'));
      } else {
        setError(data.error || t.auth.common.quickLoginFailed);
      }
    } catch (err) {
      setError(t.auth.common.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.auth.host.portalTitle}</h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? t.auth.host.subtitleLogin : t.auth.host.subtitleRegister}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.auth.common.fullNameLabel}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
                placeholder={t.auth.common.fullNamePlaceholder}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.auth.common.emailAddressLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
              placeholder={t.auth.common.emailPlaceholderHost}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.auth.common.passwordLabel}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder-gray-400"
              placeholder={t.auth.common.passwordPlaceholder}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t.auth.common.pleaseWait}</span>
              </div>
            ) : isLogin ? (
              t.auth.common.signIn
            ) : (
              t.auth.common.createAccount
            )}
          </button>
        </form>

        {/* OAuth Login Buttons */}
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t.auth.common.orUse}</span>
            </div>
          </div>

          <OAuthButtons userType="host" disabled={loading} />
        </div>

        {/* Quick Login Button */}
        {isLogin && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t.auth.common.or}</span>
            </div>
          </div>
          <button
            type="button"
              onClick={handleQuickLogin}
              disabled={loading}
              className="w-full mt-4 py-3 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                  <span>{t.auth.common.pleaseWait}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>{t.auth.common.quickLogin}</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            {isLogin
              ? t.auth.host.toggleToRegister
              : t.auth.host.toggleToLogin}
          </button>
        </div>

        {/* Client Portal Link */}
        <div className="mt-4 text-center">
          <Link
            href={withLang("/client/login")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t.auth.host.clientPortalLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
