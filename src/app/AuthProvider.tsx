import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import type { AppRole, ApprovalStatus } from '@/lib/types';

interface AuthState {
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  status: ApprovalStatus | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the Supabase session and the caller's role/status.
 *
 * IMPORTANT: role/status read here are for UX ONLY (which dashboard to show).
 * They come from the RLS-guarded `user_roles` self-read. Real authorization is
 * always enforced again in Postgres RLS and in server-side Functions — route
 * hiding is never treated as security.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadRole(activeSession: Session | null) {
    if (!activeSession) {
      setRole(null);
      setStatus(null);
      return;
    }
    // Ensure a profile row exists (self-insert is RLS-allowed).
    await supabase
      .from('profiles')
      .upsert(
        {
          id: activeSession.user.id,
          email: activeSession.user.email,
          full_name: activeSession.user.user_metadata?.full_name ?? null,
        },
        { onConflict: 'id' },
      );
    const { data } = await supabase
      .from('user_roles')
      .select('role, status')
      .eq('user_id', activeSession.user.id)
      .maybeSingle();
    setRole((data?.role as AppRole) ?? null);
    setStatus((data?.status as ApprovalStatus) ?? null);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadRole(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadRole(newSession);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthState = {
    session,
    loading,
    role,
    status,
    signInWithGoogle: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${env.siteUrl}/admin/login` },
      });
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadRole(data.session);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
