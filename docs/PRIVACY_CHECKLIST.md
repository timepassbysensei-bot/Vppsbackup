# Privacy checklist

The site collects the minimum needed and exposes even less. Review before launch.

## Data minimization
- [ ] Public pages expose only public content (notices, homework within
      retention, events, spotlight, birthday display, public resources, public settings).
- [ ] Birthday display never includes full DOB, year, age, IDs, or parent/contact data.
- [ ] Parent-message previews mask the phone; the full number appears only in a
      protected detail view.
- [ ] Leave reason/dates/attachment are visible only to the requesting teacher
      and the principal.
- [ ] Audit summaries contain no secrets, complaint text, or leave reasons.

## Consent & communication
- [ ] Admission form has an explicit consent checkbox; a `consent_records` row is written.
- [ ] Email alerts are minimal (no PII in the body) and only to the admin address.
- [ ] No WhatsApp button/number (not provided by the school).

## Third parties
- [ ] Fonts are self-hosted (no external font CDN).
- [ ] The browser talks only to Supabase + same-origin Functions (+ Turnstile
      challenge iframe). Gemini/Resend are server-side only.
- [ ] Language preference is stored in `localStorage` only (no tracking cookies).

## Retention
- [ ] Homework public visibility is limited to `homework_retention_days` (1/7/30).
- [ ] Records are soft-hidden, with private version history retained for teachers.

## Transparency
- [ ] Privacy page describes what is collected and how to contact the school.
- [ ] Do not claim legal compliance (e.g. specific regulations) without formal review.
