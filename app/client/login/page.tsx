'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OAuthButtons from '@/components/OAuthButtons';
import { appendLangToHref, getTranslations } from '@/lib/i18n';
import { useLang, useLangHref } from '@/hooks/useLang';

export default function ClientLogin() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const lang = useLang();
  const t = getTranslations(lang);
  const withLang = useLangHref();

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
        localStorage.setItem('userType', 'client');

        // Redirect to chat
        router.push(appendLangToHref('/client/chat', lang));
      } catch (err) {
        setError(t.auth.common.loginFailed);
        window.history.replaceState({}, '', appendLangToHref(window.location.pathname, lang));
      }
    }
  }, [lang, router, t.auth.common.loginFailed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/client/login' : '/api/client/register';
      const body = isLogin
        ? { email, password }
        : { email, password, username };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('userType', 'client');
        router.push(withLang('/client/chat'));
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

    // Array of demo client accounts
    const demoAccounts = [
      { email: 'demo@client.com', password: 'Demo123456', username: 'democlient' },
      { email: 'demo2@client.com', password: 'Demo123456', username: 'democlient2' },
      { email: 'demo3@client.com', password: 'Demo123456', username: 'democlient3' },
    ];

    // Randomly select one demo account
    const randomAccount = demoAccounts[Math.floor(Math.random() * demoAccounts.length)];
    console.log('Selected demo account:', randomAccount.email);

    try {
      // Try to login first
      let response = await fetch('/api/client/login', {
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
        response = await fetch('/api/client/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: randomAccount.email,
            password: randomAccount.password,
            username: randomAccount.username,
          }),
        });

        data = await response.json();
      }

      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('userType', 'client');
        router.push(withLang('/client/chat'));
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? t.auth.client.titleLogin : t.auth.client.titleRegister}
            </h1>
            <p className="text-gray-600">
              {isLogin ? t.auth.client.subtitleLogin : t.auth.client.subtitleRegister}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.auth.common.usernameLabel}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder={t.auth.common.usernamePlaceholder}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.auth.common.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder={t.auth.common.emailPlaceholderClient}
                required
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                placeholder={t.auth.common.passwordPlaceholder}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t.auth.common.pleaseWait : (isLogin ? t.auth.common.signIn : t.auth.common.signUp)}
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

            <OAuthButtons userType="client" disabled={loading} />
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
              className="w-full mt-4 py-2 px-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
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

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-green-600 hover:text-green-700 text-sm font-medium"
            >
              {isLogin ? t.auth.client.toggleToRegister : t.auth.client.toggleToLogin}
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link href={withLang("/")} className="text-gray-500 hover:text-gray-700 text-sm">
              ← {t.auth.client.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
