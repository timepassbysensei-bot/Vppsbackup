import { useState } from 'react';
import {
  BookOpen,
  Cake,
  CalendarCheck,
  FileText,
  LayoutGrid,
  Megaphone,
  Trophy,
} from 'lucide-react';
import { AdminShell, type NavGroup } from '@/app/AdminShell';
import {
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
 * Grouped navigation keeps the modules reachable on small screens. Every read
 * and write is scoped by RLS to the teacher's own classes and content; the
 * shell never decides permissions.
 */
export function TeacherDashboard() {
  const [active, setActive] = useState('overview');

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ id: 'overview', label: 'My dashboard', icon: <LayoutGrid className="h-4 w-4" /> }] },
    {
      label: 'Teaching',
      items: [
        { id: 'homework', label: 'Homework', icon: <BookOpen className="h-4 w-4" /> },
        { id: 'classnotices', label: 'Class notices', icon: <FileText className="h-4 w-4" /> },
        { id: 'birthdays', label: 'Birthdays', icon: <Cake className="h-4 w-4" /> },
        { id: 'spotlight', label: 'Student of the Month', icon: <Trophy className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Communication',
      items: [
        { id: 'noticeboard', label: 'Staff notices', icon: <Megaphone className="h-4 w-4" /> },
        { id: 'leave', label: 'Leave', icon: <CalendarCheck className="h-4 w-4" /> },
      ],
    },
  ];

  const titles: Record<string, string> = {
    overview: 'Teacher dashboard',
    homework: 'Daily homework',
    classnotices: 'Class notices',
    birthdays: 'Birthday management',
    spotlight: 'Student of the Month',
    noticeboard: 'Staff notices',
    leave: 'Staff leave center',
  };

  return (
    <AdminShell title={titles[active] ?? 'Teacher dashboard'} groups={groups} active={active} onSelect={setActive}>
      {active === 'overview' && (
        <>
          <TeacherSummary />
          <MyClassesPanel onGo={setActive} />
        </>
      )}
      {active === 'homework' && <HomeworkPanel />}
      {active === 'classnotices' && <ClassNoticesTeacherPanel />}
      {active === 'birthdays' && <BirthdaysPanel />}
      {active === 'spotlight' && <SpotlightPanel />}
      {active === 'noticeboard' && <NoticeBoardPanel />}
      {active === 'leave' && <LeaveCenterPanel />}
    </AdminShell>
  );
}
