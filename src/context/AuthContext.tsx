'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Verify the session server-side via backend (bypasses Supabase RLS on profiles table) */
async function verifyAdminSession(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/system/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Step 1: resolve the initial session with getSession() — always resolves.
    // onAuthStateChange INITIAL_SESSION can be missed or delayed in Next.js 16+
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user && session.access_token) {
          // Verify role server-side — avoids Supabase RLS blocking anon key on profiles
          const isAdmin = await verifyAdminSession(session.access_token);
          if (!mounted) return;

          if (isAdmin) {
            setUser(session.user);
            setError(null);
          } else {
            await supabase.auth.signOut();
            setUser(null);
            setError('Access denied. Admin access only.');
          }
        } else {
          setUser(null);
        }
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void initSession();

    // Step 2: listen for subsequent sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      if (session?.user && session.access_token) {
        const isAdmin = await verifyAdminSession(session.access_token);
        if (isAdmin) {
          setUser(session.user);
          setError(null);
        } else {
          await supabase.auth.signOut();
          setUser(null);
          setError('Access denied. Admin access only.');
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Redirect based on auth state (runs after loading is done)
  useEffect(() => {
    if (isLoading) return;

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.push('/login');
    } else if (user && isLoginPage) {
      router.push('/overview');
    }
  }, [user, isLoading, pathname, router]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      setError(error.message);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    }
    // Role check happens automatically in onAuthStateChange
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGoogle,
        loginWithEmail,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
