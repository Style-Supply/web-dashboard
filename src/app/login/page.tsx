'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage(): React.ReactElement {
  const { loginWithEmail, isLoading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          </form>
        </div>

        <p className="text-xs text-neutral-400 text-center mt-6">
          Access restricted to authorized personnel only
        </p>
      </div>
    </div>
  );
}
