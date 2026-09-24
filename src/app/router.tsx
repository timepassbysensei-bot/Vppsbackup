import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PublicLayout } from './PublicLayout';
import { RequireApproved, RequirePrincipal } from './guards';

import { HomePage } from '@/pages/public/HomePage';
import { AboutPage } from '@/pages/public/AboutPage';
import { AcademicsPage } from '@/pages/public/AcademicsPage';
import { NoticesPage } from '@/pages/public/NoticesPage';
import { ClassNoticesPage } from '@/pages/public/ClassNoticesPage';
import { HomeworkPage } from '@/pages/public/HomeworkPage';
import { CalendarPage } from '@/pages/public/CalendarPage';
import { AchievementsPage } from '@/pages/public/AchievementsPage';
import { BirthdaysPage } from '@/pages/public/BirthdaysPage';
import { ResourcesPage } from '@/pages/public/ResourcesPage';
import { AdmissionsPage } from '@/pages/public/AdmissionsPage';
import { ContactPage } from '@/pages/public/ContactPage';
import { PrivacyPage, TermsPage, AccessibilityPage, NotFoundPage } from '@/pages/public/LegalPages';

import { LoginPage, ResetPasswordPage } from '@/pages/admin/LoginPage';
import { PendingPage } from '@/pages/admin/PendingPage';
import { TeacherDashboard } from '@/pages/admin/TeacherDashboard';
import { PrincipalDashboard } from '@/pages/admin/PrincipalDashboard';

/**
 * Central scroll behaviour for every route change.
 *
 * Every navigation (navbar, footer, cards, mobile drawer, browser back/forward)
 * starts a new page at the top (`scrollY = 0`). An intentional `#hash` target is
 * respected instead: the element is scrolled into view, and only if the anchor
 * does not exist on the target page do we fall back to the top.
 *
 * Doing this once, here, means no page needs its own `window.scrollTo()` call.
 * The jump is forced to be instant — `html { scroll-behavior: smooth }` is kept
 * for in-page anchors, where animating is desirable.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    if (hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'auto' });
        root.style.scrollBehavior = previous;
        return;
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    root.style.scrollBehavior = previous;
  }, [pathname, hash]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/academics" element={<AcademicsPage />} />
          <Route path="/notices" element={<NoticesPage />} />
          <Route path="/class-notices" element={<ClassNoticesPage />} />
          <Route path="/homework" element={<HomeworkPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/birthdays" element={<BirthdaysPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/admissions" element={<AdmissionsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/accessibility" element={<AccessibilityPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin — route guards are UX only; RLS + Functions enforce real access */}
        <Route path="/admin/login" element={<LoginPage />} />
        {/* Landing page for the Supabase password-recovery e-mail link. */}
        <Route path="/admin/reset" element={<ResetPasswordPage />} />
        <Route path="/admin/pending" element={<PendingPage />} />
        <Route
          path="/admin/teacher"
          element={
            <RequireApproved>
              <TeacherDashboard />
            </RequireApproved>
          }
        />
        <Route
          path="/admin/principal"
          element={
            <RequirePrincipal>
              <PrincipalDashboard />
            </RequirePrincipal>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
