import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useSettings } from '@/lib/hooks/useSettings';
import { useClasses } from '@/lib/hooks/useClasses';
import { callFunction } from '@/lib/api';
import { parentMessageSchema, type ParentMessageInput } from '@/lib/validation/schemas';
import { PageTitle, Section } from '@/components/ui/primitives';
import { Turnstile } from '@/components/Turnstile';

export function ContactPage() {
  const { t } = useTranslation();
  const { data: s } = useSettings();
  const { data: classes } = useClasses();
  const [token, setToken] = useState('');
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParentMessageInput>({
    resolver: zodResolver(parentMessageSchema),
    defaultValues: { turnstileToken: '' },
  });

  async function onSubmit(values: ParentMessageInput) {
    setServerError('');
    try {
      await callFunction('submit-parent-message', {
        ...values,
        class_id: values.class_id || undefined,
        section_id: undefined,
        turnstileToken: token,
      });
      setDone(true);
    } catch {
      setServerError(t('common.error'));
    }
  }

  return (
    <>
      <PageTitle title={t('contact.title')} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-semibold text-navy">{t('contact.office')}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {s?.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-navy" aria-hidden />
                  <span>{s.address}</span>
                </li>
              )}
              {s?.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-navy" aria-hidden />
                  <a href={`tel:${s.phone.replace(/\s/g, '')}`}>{s.phone}</a>
                </li>
              )}
              {s?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-navy" aria-hidden />
                  <a href={`mailto:${s.email}`}>{s.email}</a>
                </li>
              )}
              {s?.office_hours && (
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-navy" aria-hidden />
                  <span>{s.office_hours}</span>
                </li>
              )}
            </ul>
            <p className="mt-4 rounded bg-surface p-3 text-sm text-text/70">{t('contact.feeNote')}</p>
            {/* Deliberately no WhatsApp button/number. */}
          </div>

          <div id="message" className="card p-6">
            <h2 className="font-semibold text-navy">{t('contact.sendMessage')}</h2>
            {done ? (
              <p className="mt-3 font-medium text-success" role="status">
                {t('admissions.thanks')}
              </p>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-3 grid gap-4" noValidate>
                <Field label={t('form.senderName')} error={errors.sender_name && t('form.required')}>
                  <input {...register('sender_name')} className="input" />
                </Field>
                <Field label={t('form.studentName')} error={errors.student_name && t('form.required')}>
                  <input {...register('student_name')} className="input" />
                </Field>
                <Field label={t('form.phone')} error={errors.phone && t('form.invalidPhone')}>
                  <input {...register('phone')} inputMode="tel" className="input" />
                </Field>
                <Field label={t('form.class')} error={undefined}>
                  <select {...register('class_id')} className="input">
                    <option value="">—</option>
                    {(classes ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name === 'Nursery' ? 'Nursery' : `Class ${c.name}`}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('form.message')} error={errors.body && t('form.required')}>
                  <textarea {...register('body')} rows={4} className="input" />
                </Field>
                <Turnstile onToken={setToken} />
                {serverError && <p className="text-sm text-danger">{serverError}</p>}
                <button type="submit" disabled={isSubmitting || !token} className="btn-primary w-fit">
                  {isSubmitting ? t('form.sending') : t('contact.sendMessage')}
                </button>
              </form>
            )}
          </div>
        </div>
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
