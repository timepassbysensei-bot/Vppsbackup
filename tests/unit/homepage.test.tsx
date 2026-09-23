import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@/lib/i18n';

// Keep the test hermetic: no Supabase client, no network, no auth.
vi.mock('@/lib/hooks/useLang', () => ({ useLang: () => ['en', () => {}] }));

vi.mock('@/lib/hooks/useSettings', () => ({
  useSettings: () => ({
    data: {
      name_en: 'View Point Public School',
      name_hi: 'व्यू पॉइंट पब्लिक स्कूल',
      tagline: 'Learning Today. Leading Tomorrow.',
      address: 'Ram Nagar Colony, Chas, Bokaro, Jharkhand 827013, India',
      affiliation: 'CBSE',
      established_year: 1992,
      principal_name: 'Bikash Ojha',
      principal_message_en: 'Welcome to our school.',
      facilities: [
        { key: 'library', label_en: 'Library', label_hi: 'पुस्तकालय', icon: 'library-big' },
        { key: 'transport', label_en: 'School Transport', label_hi: 'विद्यालय परिवहन', icon: 'bus' },
      ],
    },
  }),
}));

vi.mock('@/lib/hooks/usePublicData', () => ({
  useNotices: () => ({
    data: [
      {
        id: 'n1',
        title_en: 'Annual Sports Day',
        title_hi: null,
        summary_en: 'Join us on the field.',
        summary_hi: null,
        category: 'Event',
        is_urgent: true,
      },
    ],
  }),
  useUpcomingEvents: () => ({
    data: [{ id: 'e1', start_date: '2026-10-05', event_type: 'Holiday', title_en: 'Founder Day', title_hi: null }],
  }),
  useActiveTiming: () => ({
    data: { morning_start: '06:00', morning_end: '10:00', day_start: '10:10', day_end: '15:30' },
  }),
  useSpotlight: () => ({
    data: {
      display_name: 'Demo Student',
      award_title: 'Student of the Month',
      writeup_en: 'Great work.',
      writeup_hi: null,
    },
  }),
  useBirthdaysToday: () => ({ data: [{ display_name: 'Demo Child', greeting_en: 'Happy Birthday, Demo!', greeting_hi: null }] }),
}));

import { HomePage } from '@/pages/public/HomePage';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders the hero with the school name and a link into admissions', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'View Point Public School' })).toBeInTheDocument();
    const admissions = screen.getAllByRole('link', { name: /Admissions/i });
    expect(admissions.length).toBeGreaterThan(0);
    expect(admissions[0]?.getAttribute('href')).toBe('/admissions');
  });

  it('shows the live timing panel and derived stats', () => {
    renderHome();
    expect(screen.getByText('6:00 AM – 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('10:10 AM – 3:30 PM')).toBeInTheDocument();
    expect(screen.getAllByText('CBSE').length).toBeGreaterThan(0);
    expect(screen.getByText('1992')).toBeInTheDocument();
  });

  it('renders notices, events, spotlight, birthdays and facilities', () => {
    renderHome();
    expect(screen.getByText('Annual Sports Day')).toBeInTheDocument();
    expect(screen.getByText('Founder Day')).toBeInTheDocument();
    expect(screen.getByText('Demo Student')).toBeInTheDocument();
    expect(screen.getByText('Happy Birthday, Demo!')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('School Transport')).toBeInTheDocument();
  });

  it('exposes the principal message and closes with a call to action', () => {
    renderHome();
    expect(screen.getByText('Welcome to our school.')).toBeInTheDocument();
    const cta = screen.getByRole('heading', { name: 'Ready to find out more?' });
    expect(cta).toBeInTheDocument();
    // The closing band offers both admissions and contact paths.
    expect(screen.getAllByRole('link', { name: /Contact/i }).length).toBeGreaterThan(0);
  });
});
