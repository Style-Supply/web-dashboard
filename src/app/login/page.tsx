'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage(): React.ReactElement {
  const { loginWithGoogle, loginWithEmail, isLoading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  async function handleGoogleLogin(): Promise<void> {
    setLoading(true);
    await loginWithGoogle();
    // Note: loading state will remain true as user is redirected to Google
  }

  async function handleEmailSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    await loginWithEmail(email, password);
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F3]">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8">
          <div className="flex justify-center mb-8">
            <Image src="/icon/Frame.svg" alt="StyleSupply" width={48} height={48} />
          </div>

          <h1 className="text-xl font-semibold text-center text-[#2C0505] mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm text-neutral-500 text-center mb-8">
            Sign in to manage products
          </p>

          {authError && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
              {authError}
            </div>
          )}

          {!showEmailForm ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-[#2C0505] hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading ? 'Redirecting...' : 'Continue with Google'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-neutral-400">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="w-full py-2.5 px-4 rounded-lg border border-neutral-300 text-sm font-medium text-[#2C0505] hover:bg-neutral-50 transition-colors"
              >
                Sign in with email
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleEmailSubmit(e)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#2C0505] mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D] focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#2C0505] mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A021D] focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#7A021D] text-white text-sm font-medium hover:bg-[#8B1A35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-sm text-neutral-500 hover:text-neutral-700"
              >
                Back to other options
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-neutral-400 text-center mt-6">
          Access restricted to authorized personnel only
        </p>
      </div>
    </div>
  );
}
