import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, GraduationCap, KeyRound, LogIn, MailCheck, ShieldCheck, UserPlus } from 'lucide-react';
import { authErrorKey, useAuth } from '@/app/AuthProvider';
import {
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  type NewPasswordInput,
  type ResetRequestInput,
  type SignInInput,
  type SignUpInput,
} from '@/lib/validation/schemas';

type Mode = 'signin' | 'signup' | 'forgot';

/**
 * Staff sign-in — **email + password only**.
 *
 * There is deliberately NO Google/OAuth button or provider anywhere in this app:
 * staff authenticate with the e-mail address and password held by Supabase Auth.
 * Route hiding is UX only; the database (RLS + Netlify Functions) is what really
 * decides access, so a self-registered account can read nothing until a principal
 * approves it.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { session, loading, status, role } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');

  useEffect(() => {
    document.title = `${t('admin.login')} — VPPS`;
  }, [t]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-text/60">{t('common.loading')}</div>;
  }

  // Already signed in → send them where their approval status allows.
  if (session) {
    if (status !== 'approved') return <Navigate to="/admin/pending" replace />;
    return <Navigate to={role === 'principal' ? '/admin/principal' : '/admin/teacher'} replace />;
  }

  return (
    <div className="mesh-brand grain relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="absolute inset-0 bg-grid opacity-25" aria-hidden />
      <div className="orb animate-floaty -left-16 top-10 h-64 w-64 bg-sky/30" aria-hidden />
      <div className="orb animate-drift -bottom-24 right-0 h-72 w-72 bg-amber/25" aria-hidden />

      <div className="relative w-full max-w-md py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('admin.backToSite')}
        </Link>

        <div className="card mt-3 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-navy-600 to-navy-900 text-white shadow-md">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-navy">{t('admin.login')}</h1>
              <p className="text-xs text-text/60">View Point Public School</p>
            </div>
          </div>

          {mode === 'signin' && (
            <p className="mt-4 text-sm text-text/70">{t('admin.loginIntro')}</p>
          )}

          {/* Mode switch — plain buttons (no client-side routing changes). */}
          <div
            className="mt-5 inline-flex w-full items-center gap-1 rounded-full bg-surface p-1"
            role="group"
            aria-label={t('admin.login')}
          >
            <ModeButton active={mode === 'signin'} onClick={() => setMode('signin')} icon={<LogIn className="h-4 w-4" aria-hidden />}>
              {t('admin.tabSignIn')}
            </ModeButton>
            <ModeButton active={mode === 'signup'} onClick={() => setMode('signup')} icon={<UserPlus className="h-4 w-4" aria-hidden />}>
              {t('admin.tabSignUp')}
            </ModeButton>
          </div>

          {mode === 'signin' && <SignInForm onForgot={() => setMode('forgot')} />}
          {mode === 'signup' && <SignUpForm />}
          {mode === 'forgot' && <ForgotForm onBack={() => setMode('signin')} />}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-white/70">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          {t('admin.securityNote')}
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-white text-navy shadow-sm' : 'text-text/70 hover:text-navy'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-text/80">{label}</span>
      {children}
      {error && (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values: SignInInput) {
    setErrorKey(null);
    try {
      await signIn(values.email, values.password);
      // The AuthProvider session/role updates and this page redirects itself.
    } catch (err) {
      setErrorKey(authErrorKey(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4" noValidate>
      <AuthField label={t('admin.email')} error={errors.email ? t('admin.needEmail') : undefined}>
        <input {...register('email')} type="email" autoComplete="email" inputMode="email" className="input" />
      </AuthField>
      <AuthField label={t('admin.password')} error={errors.password ? t('admin.needPassword') : undefined}>
        <input {...register('password')} type="password" autoComplete="current-password" className="input" />
      </AuthField>

      {errorKey && (
        <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {t(errorKey)}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        <LogIn className="h-4 w-4" aria-hidden />
        {isSubmitting ? t('admin.signingIn') : t('admin.signIn')}
      </button>

      <button type="button" onClick={onForgot} className="text-sm font-medium text-navy underline-offset-4 hover:underline">
        {t('admin.forgot')}
      </button>
    </form>
  );
}

function SignUpForm() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm: '' },
  });

  async function onSubmit(values: SignUpInput) {
    setErrorKey(null);
    try {
      const { needsEmailConfirmation } = await signUp(values.email, values.password, values.full_name);
      // With confirmation ON there is no session yet → tell the user to confirm.
      // With it OFF the AuthProvider already redirected this page to /admin/pending.
      if (needsEmailConfirmation) setAwaitingEmail(true);
    } catch (err) {
      setErrorKey(authErrorKey(err));
    }
  }

  if (awaitingEmail) {
    return (
      <div className="mt-5 rounded-lg bg-surface p-4" role="status">
        <MailCheck className="h-6 w-6 text-teal-700" aria-hidden />
        <h2 className="mt-2 font-semibold text-navy">{t('admin.confirmEmailTitle')}</h2>
        <p className="mt-1 text-sm text-text/70">{t('admin.confirmEmailBody')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4" noValidate>
      <AuthField label={t('admin.fullName')} error={errors.full_name ? t('admin.needName') : undefined}>
        <input {...register('full_name')} autoComplete="name" className="input" />
      </AuthField>
      <AuthField label={t('admin.email')} error={errors.email ? t('admin.needEmail') : undefined}>
        <input {...register('email')} type="email" autoComplete="email" inputMode="email" className="input" />
      </AuthField>
      <AuthField
        label={t('admin.password')}
        error={errors.password ? t('admin.passwordHint') : undefined}
      >
        <input {...register('password')} type="password" autoComplete="new-password" className="input" />
      </AuthField>
      <AuthField
        label={t('admin.confirmPassword')}
        error={errors.confirm ? t('admin.passwordMismatch') : undefined}
      >
        <input {...register('confirm')} type="password" autoComplete="new-password" className="input" />
      </AuthField>

      {errorKey && (
        <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {t(errorKey)}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        <UserPlus className="h-4 w-4" aria-hidden />
        {isSubmitting ? t('admin.creatingAccount') : t('admin.signUp')}
      </button>

      <p className="text-xs leading-relaxed text-text/60">{t('admin.registerNote')}</p>
    </form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { requestPasswordReset } = useAuth();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(resetRequestSchema), defaultValues: { email: '' } });

  async function onSubmit(values: ResetRequestInput) {
    setErrorKey(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      setErrorKey(authErrorKey(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4" noValidate>
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-navy">
          <KeyRound className="h-4 w-4" aria-hidden />
          {t('admin.forgotTitle')}
        </h2>
        <p className="mt-1 text-sm text-text/70">{t('admin.forgotIntro')}</p>
      </div>

      {sent ? (
        <p className="rounded bg-surface px-3 py-2 text-sm text-text/80" role="status">
          {t('admin.resetSent')}
        </p>
      ) : (
        <>
          <AuthField label={t('admin.email')} error={errors.email ? t('admin.needEmail') : undefined}>
            <input {...register('email')} type="email" autoComplete="email" inputMode="email" className="input" />
          </AuthField>
          {errorKey && (
            <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {t(errorKey)}
            </p>
          )}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            <MailCheck className="h-4 w-4" aria-hidden />
            {isSubmitting ? t('admin.sending') : t('admin.sendResetLink')}
          </button>
        </>
      )}

      <button type="button" onClick={onBack} className="text-sm font-medium text-navy underline-offset-4 hover:underline">
        {t('admin.backToSignIn')}
      </button>
    </form>
  );
}

/**
 * Password-recovery landing page (`/admin/reset`).
 *
 * Supabase's recovery link signs the user in with a short-lived session, so the
 * new password is set with `auth.updateUser({ password })`. If no recovery
 * session exists, the user is told the link is invalid rather than shown a form
 * that cannot work.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { session, loading, updatePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = `${t('admin.newPasswordTitle')} — VPPS`;
  }, [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  async function onSubmit(values: NewPasswordInput) {
    setErrorKey(null);
    try {
      await updatePassword(values.password);
      setDone(true);
      await signOut();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      setErrorKey(authErrorKey(err));
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-text/60">{t('common.loading')}</div>;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-surface p-4">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-navy">{t('admin.newPasswordTitle')}</h1>
        <p className="mt-2 text-sm text-text/70">{t('admin.newPasswordBody')}</p>

        {!session ? (
          <>
            <p className="mt-4 rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {t('admin.resetLinkInvalid')}
            </p>
            <Link to="/admin/login" className="btn-secondary mt-4 w-full">
              {t('admin.backToSignIn')}
            </Link>
          </>
        ) : done ? (
          <p className="mt-4 rounded bg-surface px-3 py-2 text-sm text-success" role="status">
            {t('admin.passwordUpdated')}
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 grid gap-4" noValidate>
            <AuthField label={t('admin.password')} error={errors.password ? t('admin.passwordHint') : undefined}>
              <input {...register('password')} type="password" autoComplete="new-password" className="input" />
            </AuthField>
            <AuthField
              label={t('admin.confirmPassword')}
              error={errors.confirm ? t('admin.passwordMismatch') : undefined}
            >
              <input {...register('confirm')} type="password" autoComplete="new-password" className="input" />
            </AuthField>
            {errorKey && (
              <p className="rounded bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {t(errorKey)}
              </p>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              <KeyRound className="h-4 w-4" aria-hidden />
              {t('admin.savePassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
