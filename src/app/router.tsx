import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

import { LoginPage } from '@/pages/admin/LoginPage';
import { PendingPage } from '@/pages/admin/PendingPage';
import { TeacherDashboard } from '@/pages/admin/TeacherDashboard';
import { PrincipalDashboard } from '@/pages/admin/PrincipalDashboard';

export function AppRouter() {
  return (
    <BrowserRouter>
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
