import { useTranslation } from 'react-i18next';
import { useSettings } from '@/lib/hooks/useSettings';
import { PageTitle, Section } from '@/components/ui/primitives';

/**
 * Neutral, factual legal/utility pages. We do NOT assert legal compliance
 * (that requires formal review); we simply describe practices plainly and point
 * visitors to the school office / privacy contact.
 */

export function PrivacyPage() {
  const { data: s } = useSettings();
  return (
    <>
      <PageTitle title="Privacy" />
      <Section>
        <div className="prose max-w-2xl text-text/80">
          <p>
            This website collects only the information you choose to submit through its enquiry and message forms
            (for example, name, phone number, and message). This information is used solely to respond to your
            enquiry and is accessible only to authorized school staff.
          </p>
          <p className="mt-3">
            We do not sell personal information. Automated challenge checks (Cloudflare Turnstile) are used to reduce
            spam. For any question about your data, please contact the school office
            {s?.privacy_contact ? `: ${s.privacy_contact}` : s?.email ? ` at ${s.email}` : ''}.
          </p>
        </div>
      </Section>
    </>
  );
}

export function TermsPage() {
  return (
    <>
      <PageTitle title="Terms" />
      <Section>
        <div className="prose max-w-2xl text-text/80">
          <p>
            The information on this website is provided for general reference and may change. Timings, notices, and
            admission availability are updated by the school office; please confirm important details directly with
            the office. Content may not be reproduced without permission.
          </p>
        </div>
      </Section>
    </>
  );
}

export function AccessibilityPage() {
  const { data: s } = useSettings();
  return (
    <>
      <PageTitle title="Accessibility" />
      <Section>
        <div className="prose max-w-2xl text-text/80">
          <p>
            We aim to meet WCAG 2.1 AA guidance: keyboard navigation, visible focus, sufficient color contrast, large
            touch targets, and reduced-motion support. If you encounter a barrier using this site, please tell us so we
            can help and improve
            {s?.email ? ` — ${s.email}` : ''}.
          </p>
        </div>
      </Section>
    </>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageTitle title="404" subtitle="Page not found." />
      <Section>
        <a href="/" className="btn-primary">
          {t('nav.home')}
        </a>
      </Section>
    </>
  );
}
