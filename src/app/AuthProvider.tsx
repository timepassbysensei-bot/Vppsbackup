import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import type { AppRole, ApprovalStatus } from '@/lib/types';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  status: ApprovalStatus | null;
  /** Email + password sign-in. Throws on failure (see `authErrorKey`). */
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Self-service teacher registration. Returns whether Supabase requires the
   * user to confirm their e-mail before a session exists.
   */
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  /** Sends the Supabase password-recovery e-mail. */
  requestPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for the signed-in / recovery session. */
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Where Supabase sends the user back to after confirming or recovering. */
export const AUTH_CALLBACK_URL = `${env.siteUrl}/admin/login`;
export const PASSWORD_RESET_CALLBACK_URL = `${env.siteUrl}/admin/reset`;

/**
 * Creates the profile row for the signed-in user if it does not exist yet.
 *
 * The authoritative `user_roles` row (role + status, defaulting to
 * teacher/pending) is created by the `handle_new_user` database trigger in
 * `supabase/migrations/0005_auth_signup.sql` — never from client code and never
 * from user-editable metadata.
 */
async function ensureProfile(activeSession: Session) {
  await supabase.from('profiles').upsert(
    {
      id: activeSession.user.id,
      email: activeSession.user.email,
      full_name: activeSession.user.user_metadata?.full_name ?? null,
    },
    { onConflict: 'id' },
  );
}

/**
 * Holds the Supabase session and the caller's role/status.
 *
 * IMPORTANT: role/status read here are for UX ONLY (which dashboard to show).
 * They come from the RLS-guarded `user_roles` self-read. Real authorization is
 * always enforced again in Postgres RLS and in server-side Functions — route
 * hiding is never treated as security, and nothing in localStorage is ever
 * trusted for authorization.
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
    await ensureProfile(activeSession);
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
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
    },
    signUp: async (email, password, fullName) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: AUTH_CALLBACK_URL,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      // With e-mail confirmation enabled Supabase returns no session until the
      // user clicks the link in the confirmation e-mail.
      return { needsEmailConfirmation: !data.session };
    },
    requestPasswordReset: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: PASSWORD_RESET_CALLBACK_URL,
      });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
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

/**
 * Maps a Supabase auth error to an i18n key under `admin.errors.*`.
 * The raw message is never shown to the user (it can leak account existence).
 */
export function authErrorKey(err: unknown): string {
  const message = String((err as { message?: string })?.message ?? err ?? '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'admin.errors.invalidCredentials';
  if (message.includes('email not confirmed')) return 'admin.errors.emailNotConfirmed';
  if (message.includes('already registered') || message.includes('already exists'))
    return 'admin.errors.alreadyRegistered';
  if (message.includes('password should be at least') || message.includes('weak password'))
    return 'admin.errors.weakPassword';
  if (message.includes('rate limit') || message.includes('too many'))
    return 'admin.errors.tooManyRequests';
  if (message.includes('unable to validate email') || message.includes('invalid email'))
    return 'admin.errors.invalidEmail';
  if (message.includes('email address not authorized')) return 'admin.errors.emailNotAllowed';
  return 'admin.errors.generic';
}
