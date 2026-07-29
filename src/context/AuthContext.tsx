'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { ResourcePermission, ManagedResource, PermissionAction } from '@/lib/staff';


const ALLOWED_EMAIL_DOMAIN = 'stylesupply.io';
const ALLOWED_EMAIL_ADDRESSES = new Set<string>([]);

function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (ALLOWED_EMAIL_ADDRESSES.has(normalized)) return true;
  const at = normalized.lastIndexOf('@');
  if (at === -1) return false;
  return normalized.slice(at + 1) === ALLOWED_EMAIL_DOMAIN;
}

export type AppRole = 'user' | 'manager' | 'admin';

export interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  permissions: ResourcePermission[] | null;  // null = admin (all access)
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Returns true if the current user can perform the given action on a resource. */
  can: (resource: ManagedResource, action: PermissionAction) => boolean;
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

async function loadUserRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  const role = data?.role as AppRole | undefined;
  if (role === 'admin' || role === 'manager') return role;
  return 'user';
}

async function loadManagerPermissions(userId: string): Promise<ResourcePermission[]> {
  // Get staff_id for this user
  const { data: staff } = await supabase
    .from('staff_members')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!staff) return [];

  const { data: perms } = await supabase
    .from('staff_permissions')
    .select('resource, can_view, can_create, can_edit, can_delete')
    .eq('staff_id', staff.id);

  return (perms ?? []) as ResourcePermission[];
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<ResourcePermission[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function hydrateSession(sessionUser: User): Promise<void> {
    const email = sessionUser.email?.toLowerCase() ?? '';

    // @stylesupply.io emails are always admin
    if (email.endsWith('@stylesupply.io')) {
      setUser(sessionUser);
      setRole('admin');
      setPermissions(null); // admin has all access
      return;
    }

    // Load role from DB
    const userRole = await loadUserRole(sessionUser.id);

    if (userRole === 'manager') {
      const perms = await loadManagerPermissions(sessionUser.id);
      setUser(sessionUser);
      setRole('manager');
      setPermissions(perms);
    } else if (userRole === 'admin') {
      setUser(sessionUser);
      setRole('admin');
      setPermissions(null);
    } else {
      // Regular users shouldn't have dashboard access
      await supabase.auth.signOut();
      setUser(null);
      setRole(null);
      setPermissions(null);
      setError('Access denied. Dashboard requires admin or manager role.');
    }
  }

  // Check session on mount and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        if (email && isAllowedEmail(email)) {
          await hydrateSession(session.user);
        } else {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setError('Access denied. This dashboard is restricted.');
        }
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email?.toLowerCase();
        if (email && isAllowedEmail(email)) {
          setError(null);
          await hydrateSession(session.user);
        } else {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          setError('Access denied. This dashboard is restricted.');
        }
      } else {
        setUser(null);
        setRole(null);
        setPermissions(null);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    const isLoginPage = pathname === '/login';
    if (!user && !isLoginPage) router.push('/login');
    else if (user && isLoginPage) router.push('/products');
  }, [user, isLoading, pathname, router]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (error) setError(error.message);
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    if (!isAllowedEmail(email)) {
      setError('Access denied. This dashboard is restricted.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setPermissions(null);
    router.push('/login');
  }, [router]);

  /**
   * Check if current user can perform an action on a resource.
   * - Admins: always true
   * - Managers: check permissions array
   * - Others: false
   */
  const can = useCallback(
    (resource: ManagedResource, action: PermissionAction): boolean => {
      if (role === 'admin') return true;
      if (role !== 'manager' || !permissions) return false;
      const perm = permissions.find((p) => p.resource === resource);
      if (!perm) return false;
      const map: Record<PermissionAction, keyof ResourcePermission> = {
        view: 'can_view', create: 'can_create', edit: 'can_edit', delete: 'can_delete',
      };
      return perm[map[action]] === true;
    },
    [role, permissions],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      role,
      permissions,
      isLoading,
      isAuthenticated: !!user,
      can,
      loginWithGoogle,
      loginWithEmail,
      logout,
      error,
    }),
    [user, role, permissions, isLoading, can, loginWithGoogle, loginWithEmail, logout, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
