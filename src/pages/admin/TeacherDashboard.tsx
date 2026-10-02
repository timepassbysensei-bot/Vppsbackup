import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  BookOpen,
  Cake,
  CalendarCheck,
  FileText,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { AdminShell, type NavGroup } from '@/app/AdminShell';
import { ModuleGrid, ModuleSection, type ModuleItem } from '@/components/admin/ModuleGrid';
import { Panel } from '@/components/admin/kit';
import { useAuth } from '@/app/AuthProvider';
import {
  AccessSummaryPanel,
  BirthdaysPanel,
  ClassNoticesTeacherPanel,
  HomeworkPanel,
  LeaveCenterPanel,
  MyClassesPanel,
  NoticeBoardPanel,
  SpotlightPanel,
  TeacherSummary,
} from './teacher/TeacherPanels';

/**
 * Teacher dashboard.
 *
 * Layout follows the original site: the modules are visible as buttons ON the
 * page, not hidden behind the mobile drawer. Tapping one shows it directly
 * underneath the buttons, so every tool is one tap away. The drawer still exists
 * as secondary navigation.
 *
 * An approved PRINCIPAL opens this same dashboard through supervisory access
 * (see `RequireTeacherAccess`): the role is never changed, nothing is stored in
 * localStorage, and no second sign-in is needed. Class-specific tools then offer
 * every class, because the RLS helpers grant the principal all classes.
 */
export function TeacherDashboard() {
  const { role } = useAuth();
  const isPrincipal = role === 'principal';
  const [active, setActive] = useState('homework');

  const groups: NavGroup[] = [
    {
      label: 'Teaching',
      items: [
        { id: 'homework', label: 'Daily homework', icon: <BookOpen className="h-4 w-4" /> },
        { id: 'classnotices', label: 'Class notices', icon: <FileText className="h-4 w-4" /> },
        { id: 'birthdays', label: 'Birthdays', icon: <Cake className="h-4 w-4" /> },
        { id: 'spotlight', label: 'Student of the Month', icon: <Trophy className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Communication',
      items: [
        { id: 'noticeboard', label: 'Notice board', icon: <Megaphone className="h-4 w-4" /> },
        { id: 'leave', label: 'Leave center', icon: <CalendarCheck className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Overview',
      items: [
        { id: 'overview', label: 'My dashboard', icon: <LayoutGrid className="h-4 w-4" /> },
        { id: 'access', label: 'Access summary', icon: <ShieldCheck className="h-4 w-4" /> },
      ],
    },
  ];

  const titles: Record<string, string> = {
    overview: 'Teacher dashboard',
    access: 'Access summary',
    homework: 'Daily homework',
    classnotices: 'Class notices',
    birthdays: 'Birthday management',
    spotlight: 'Student of the Month',
    noticeboard: 'Principal notice board',
    leave: 'Staff leave center',
  };

  const teaching: ModuleItem[] = [
    { id: 'homework', label: 'Daily Homework Uploader', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'classnotices', label: 'Class Notices', icon: <FileText className="h-5 w-5" /> },
    { id: 'noticeboard', label: 'Principal Notice Board', icon: <Megaphone className="h-5 w-5" /> },
    { id: 'leave', label: 'Staff Leave Center', icon: <CalendarCheck className="h-5 w-5" /> },
    { id: 'birthdays', label: 'Birthday Management', icon: <Cake className="h-5 w-5" /> },
    { id: 'spotlight', label: 'Student of the Month', icon: <Trophy className="h-5 w-5" /> },
  ];

  const overviewModules: ModuleItem[] = [
    { id: 'overview', label: 'My Dashboard', icon: <LayoutGrid className="h-5 w-5" /> },
    { id: 'access', label: 'Access Summary', icon: <ShieldCheck className="h-5 w-5" /> },
  ];

  return (
    <AdminShell
      title={titles[active] ?? 'Teacher dashboard'}
      groups={groups}
      active={active}
      onSelect={setActive}
      homeLabel="My Dashboard"
      headerRight={
        isPrincipal ? (
          <Link to="/admin/principal" className="btn-primary">
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            Principal Dashboard
          </Link>
        ) : undefined
      }
    >
      {isPrincipal && (
        <div className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2.5 text-sm text-amber-700">
          <strong className="font-semibold">Principal access — all authorized classes.</strong>{' '}
          You are using the teacher tools as the principal. Class pickers offer every class and
          section, and important changes are written to the audit log.
        </div>
      )}

      <Panel
        title="Teacher modules"
        description="Tap a module to open it below. You can permanently delete only the content you created."
      >
        <ModuleSection title="Teaching and communication">
          <ModuleGrid items={teaching} active={active} onSelect={setActive} ariaLabel="Teaching modules" />
        </ModuleSection>
        <ModuleSection title="Your account">
          <ModuleGrid items={overviewModules} active={active} onSelect={setActive} ariaLabel="Account modules" />
        </ModuleSection>
      </Panel>

      {active === 'overview' && (
        <>
          <TeacherSummary />
          <MyClassesPanel onGo={setActive} />
        </>
      )}
      {active === 'access' && <AccessSummaryPanel />}
      {active === 'homework' && <HomeworkPanel />}
      {active === 'classnotices' && <ClassNoticesTeacherPanel />}
      {active === 'birthdays' && <BirthdaysPanel />}
      {active === 'spotlight' && <SpotlightPanel />}
      {active === 'noticeboard' && <NoticeBoardPanel />}
      {active === 'leave' && <LeaveCenterPanel />}
    </AdminShell>
  );
}
