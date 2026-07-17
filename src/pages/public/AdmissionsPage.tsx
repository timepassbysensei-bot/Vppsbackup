import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSettings } from '@/lib/hooks/useSettings';
import { useClasses } from '@/lib/hooks/useClasses';
import { callFunction } from '@/lib/api';
import { isAutomaticAdmissionOpen } from '@/lib/time';
import { admissionSchema, type AdmissionInput } from '@/lib/validation/schemas';
import { PageTitle, Section } from '@/components/ui/primitives';
import { Turnstile } from '@/components/Turnstile';

export function AdmissionsPage() {
  const { t } = useTranslation();
  const { data: s } = useSettings();
  const { data: classes } = useClasses();
  const [token, setToken] = useState('');
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const mode = s?.admission_mode ?? 'automatic';
  const open = mode === 'open' || (mode === 'automatic' && isAutomaticAdmissionOpen());

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdmissionInput>({
    resolver: zodResolver(admissionSchema),
    defaultValues: { consent: false as unknown as true, turnstileToken: '' },
  });

  async function onSubmit(values: AdmissionInput) {
    setServerError('');
    try {
      await callFunction('submit-admission', { ...values, turnstileToken: token });
      setDone(true);
    } catch {
      setServerError(t('common.error'));
    }
  }

  return (
    <>
      <PageTitle title={t('admissions.title')} />
      <Section>
        {/* Fees are NEVER displayed. */}
        <p className="mb-4 rounded bg-surface p-3 text-sm text-text/70">{t('admissions.feeNote')}</p>

        {!open ? (
          <div className="card p-6" role="status">
            <p>{t('admissions.closed')}</p>
          </div>
        ) : done ? (
          <div className="card p-6" role="status">
            <p className="font-semibold text-success">{t('admissions.thanks')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="card grid max-w-2xl gap-4 p-6" noValidate>
            <Field label={t('form.studentName')} error={errors.student_name && t('form.required')}>
              <input {...register('student_name')} className="input" />
            </Field>
            <Field label={t('form.guardianName')} error={errors.guardian_name && t('form.required')}>
              <input {...register('guardian_name')} className="input" />
            </Field>
            <Field label={t('form.phone')} error={errors.phone && t('form.invalidPhone')}>
              <input {...register('phone')} inputMode="tel" className="input" />
            </Field>
            <Field label={t('form.email')} error={undefined}>
              <input {...register('email')} inputMode="email" className="input" />
            </Field>
            <Field label={t('form.classApplying')} error={errors.class_applying && t('form.required')}>
              <select {...register('class_applying')} className="input">
                <option value="">—</option>
                {(classes ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('form.currentSchool')} error={undefined}>
              <input {...register('current_school')} className="input" />
            </Field>
            <Field label={t('form.message')} error={undefined}>
              <textarea {...register('message')} rows={3} className="input" />
            </Field>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" {...register('consent')} className="mt-1 min-h-touch min-w-touch" />
              <span>{t('admissions.consent')}</span>
            </label>
            {errors.consent && <p className="text-sm text-danger">{t('form.required')}</p>}

            <Turnstile onToken={setToken} />
            {serverError && <p className="text-sm text-danger">{serverError}</p>}

            <button type="submit" disabled={isSubmitting || !token} className="btn-primary w-fit">
              {isSubmitting ? t('form.sending') : t('admissions.submit')}
            </button>
          </form>
        )}
      </Section>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-danger">{error}</span>}
    </label>
  );
}
