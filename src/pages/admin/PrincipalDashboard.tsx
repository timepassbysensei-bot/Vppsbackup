import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  Cog,
  Contact,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Mail,
  Megaphone,
  Palette,
  Quote,
  ScrollText,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserCog,
  Users,
  Wand2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminShell, type NavGroup } from '@/app/AdminShell';
import { ModuleGrid, ModuleSection, type ModuleItem } from '@/components/admin/ModuleGrid';
import { Panel } from '@/components/admin/kit';
import { pendingRegistrations, useStaff } from '@/lib/hooks/useStaff';
import { AssignmentsPanel, RegistrationsPanel, StaffPanel } from './principal/PeoplePanels';
import {
  AdmissionsPanel,
  InternalNoticesPanel,
  LeaveInboxPanel,
  ParentMessagesPanel,
} from './principal/CommsPanels';
import {
  CalendarPanel,
  ClassNoticesAdminPanel,
  HomeworkAdminPanel,
  PublicNoticesPanel,
  ResourcesPanel,
} from './principal/ContentPanels';
import {
  AchievementsPanel,
  EmergencyAlertPanel,
  FaqPanel,
  GalleryPanel,
} from './principal/MediaPanels';
import { AuditLogPanel, SchoolSettingsPanel, TimingPanel } from './principal/SettingsPanels';
import { BrandingPanel } from './BrandingPanel';
import { ClassesPanel } from './ClassesPanel';

/**
 * Principal dashboard.
 *
 * Layout follows the original site: every module is a button visible directly on
 * the page (two columns on a phone), with the active module rendered underneath.
 * The mobile drawer and the desktop sidebar still exist, but only as secondary
 * navigation — nothing is reachable *only* through them.
 *
 * Route/visibility here is UX only. Every read and write is independently
 * enforced by Postgres RLS and by the Netlify Functions, so a user who bypasses
 * the UI still cannot do anything they are not authorized for.
 */
export function PrincipalDashboard() {
  const [active, setActive] = useState('overview');

  // The SAME hook and cache key the Pending Registrations page uses, so the
  // badge count can never disagree with the list. (It previously used a separate
  // one-off count query with its own cache key — that is how "badge 1 / list
  // empty" became possible.)
  const { data: staff } = useStaff();
  const pendingCount = pendingRegistrations(staff).length;

  const { data: unread } = useQuery({
    queryKey: ['badge-unread'],
    queryFn: async () => {
      const { count: c } = await supabase
        .from('parent_messages')
        .select('*', { count: 'exact', head: true })
        .eq('unread_principal', true)
        .eq('is_deleted', false);
      return c ?? 0;
    },
  });
  const { data: leavePending } = useQuery({
    queryKey: ['badge-leave'],
    queryFn: async () => {
      const { count: c } = await supabase
        .from('teacher_leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');
      return c ?? 0;
    },
  });
  const { data: submitted } = useQuery({
    queryKey: ['badge-spotlight'],
    queryFn: async () => {
      const { count: c } = await supabase
        .from('student_spotlights')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');
      return c ?? 0;
    },
  });

  const titles: Record<string, string> = {
    overview: 'Principal dashboard',
    registrations: 'Pending registrations',
    staff: 'Staff roster',
    assignments: 'Teacher assignments',
    roles: 'Account and role management',
    homework: 'All homework',
    classnotices: 'All class notices',
    timing: 'Timing manager',
    calendar: 'Calendar',
    classes: 'Class and section manager',
    parentmessages: 'Parent messages',
    leave: 'Leave inbox',
    internal: 'Internal notices',
    alerts: 'Emergency alert',
    publicnotices: 'Public notices',
    resources: 'Resources manager',
    faq: 'Chatbot FAQs',
    gallery: 'Gallery manager',
    achievements: 'Achievements',
    branding: 'Branding',
    logo: 'Change logo',
    favicon: 'Change favicon',
    admissions: 'Admission enquiries',
    settings: 'School settings',
    audit: 'Audit log',
  };

  const people: ModuleItem[] = [
    { id: 'registrations', label: 'Pending Registrations', icon: <UserCheck className="h-5 w-5" />, badge: pendingCount },
    { id: 'staff', label: 'Staff Roster', icon: <Users className="h-5 w-5" /> },
    { id: 'assignments', label: 'Teacher Assignments', icon: <Contact className="h-5 w-5" /> },
    { id: 'roles', label: 'Account & Role Management', icon: <UserCog className="h-5 w-5" /> },
  ];

  const academics: ModuleItem[] = [
    { id: 'homework', label: 'All Homework', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'classnotices', label: 'All Class Notices', icon: <FileText className="h-5 w-5" /> },
    { id: 'timing', label: 'Timing Manager', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-5 w-5" /> },
    { id: 'classes', label: 'Class & Section Manager', icon: <Layers className="h-5 w-5" /> },
  ];

  const communication: ModuleItem[] = [
    { id: 'parentmessages', label: 'Parent Messages', icon: <Mail className="h-5 w-5" />, badge: unread },
    { id: 'leave', label: 'Leave Inbox', icon: <ClipboardList className="h-5 w-5" />, badge: leavePending },
    { id: 'internal', label: 'Internal Notices', icon: <Megaphone className="h-5 w-5" /> },
    { id: 'alerts', label: 'Emergency Alert', icon: <Bell className="h-5 w-5" /> },
  ];

  const content: ModuleItem[] = [
    { id: 'publicnotices', label: 'Public Notices', icon: <ScrollText className="h-5 w-5" /> },
    { id: 'resources', label: 'Resources Manager', icon: <FileText className="h-5 w-5" /> },
    { id: 'gallery', label: 'Gallery Manager', icon: <ImageIcon className="h-5 w-5" /> },
    { id: 'achievements', label: 'Achievements', icon: <Trophy className="h-5 w-5" />, badge: submitted },
    { id: 'faq', label: 'Chatbot FAQs', icon: <Quote className="h-5 w-5" /> },
    { id: 'branding', label: 'Branding', icon: <Palette className="h-5 w-5" /> },
    { id: 'logo', label: 'Change Logo', icon: <Wand2 className="h-5 w-5" /> },
    { id: 'favicon', label: 'Change Favicon', icon: <Award className="h-5 w-5" /> },
  ];

  const admissions: ModuleItem[] = [
    { id: 'admissions', label: 'Admission Enquiries', icon: <Building2 className="h-5 w-5" /> },
  ];

  const settingsModules: ModuleItem[] = [
    { id: 'settings', label: 'School Settings', icon: <Settings className="h-5 w-5" /> },
    { id: 'audit', label: 'Audit Log', icon: <ShieldCheck className="h-5 w-5" /> },
  ];

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ id: 'overview', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" /> }] },
    { label: 'People', items: people },
    { label: 'Academics', items: academics },
    { label: 'Communication', items: communication },
    { label: 'Content & media', items: content },
    { label: 'Admissions', items: admissions },
    { label: 'Settings', items: settingsModules },
  ];

  const counts = {
    pending: pendingCount,
    unread: unread ?? 0,
    leave: leavePending ?? 0,
    submitted: submitted ?? 0,
  };

  return (
    <AdminShell
      title={titles[active] ?? 'Principal dashboard'}
      groups={groups}
      active={active}
      onSelect={setActive}
      homeLabel="Dashboard"
      headerRight={
        <Link to="/admin/teacher" className="btn-secondary">
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          Teacher Dashboard
        </Link>
      }
    >
      <Panel
        title="Principal modules"
        description="Tap a module to open it below. Counts show what is waiting for a decision."
      >
        <ModuleSection title="People">
          <ModuleGrid items={people} active={active} onSelect={setActive} ariaLabel="People modules" />
        </ModuleSection>
        <ModuleSection title="Academics">
          <ModuleGrid items={academics} active={active} onSelect={setActive} ariaLabel="Academics modules" />
        </ModuleSection>
        <ModuleSection title="Communication">
          <ModuleGrid items={communication} active={active} onSelect={setActive} ariaLabel="Communication modules" />
        </ModuleSection>
        <ModuleSection title="Content and media">
          <ModuleGrid items={content} active={active} onSelect={setActive} ariaLabel="Content modules" />
        </ModuleSection>
        <ModuleSection title="Admissions">
          <ModuleGrid items={admissions} active={active} onSelect={setActive} ariaLabel="Admissions modules" />
        </ModuleSection>
        <ModuleSection title="Settings">
          <ModuleGrid items={settingsModules} active={active} onSelect={setActive} ariaLabel="Settings modules" />
        </ModuleSection>
      </Panel>

      {active === 'overview' && <Overview counts={counts} onGo={setActive} />}
      {active === 'registrations' && <RegistrationsPanel />}
      {active === 'staff' && <StaffPanel />}
      {active === 'assignments' && <AssignmentsPanel />}
      {/* Role/permission changes live in the staff roster's manage panel. */}
      {active === 'roles' && <StaffPanel />}
      {active === 'timing' && <TimingPanel />}
      {active === 'homework' && <HomeworkAdminPanel />}
      {active === 'classnotices' && <ClassNoticesAdminPanel />}
      {active === 'calendar' && <CalendarPanel />}
      {active === 'classes' && <ClassesPanel />}
      {active === 'parentmessages' && <ParentMessagesPanel />}
      {active === 'leave' && <LeaveInboxPanel />}
      {active === 'internal' && <InternalNoticesPanel />}
      {active === 'alerts' && <EmergencyAlertPanel />}
      {active === 'publicnotices' && <PublicNoticesPanel />}
      {active === 'resources' && <ResourcesPanel />}
      {active === 'gallery' && <GalleryPanel />}
      {active === 'achievements' && <AchievementsPanel />}
      {active === 'faq' && <FaqPanel />}
      {active === 'branding' && <BrandingPanel />}
      {active === 'logo' && <BrandingPanel initialSection="logo" />}
      {active === 'favicon' && <BrandingPanel initialSection="favicon" />}
      {active === 'admissions' && <AdmissionsPanel />}
      {active === 'settings' && <SchoolSettingsPanel />}
      {active === 'audit' && <AuditLogPanel />}
    </AdminShell>
  );
}

/**
 * Compact overview: small summary tiles that jump straight into the module, plus
 * a short orientation note. The module buttons above remain the primary
 * navigation, so this never replaces them.
 */
function Overview({
  onGo,
  counts,
}: {
  onGo: (id: string) => void;
  counts: { pending: number; unread: number; leave: number; submitted: number };
}) {
  const cards: { id: string; label: string; value: number }[] = [
    { id: 'registrations', label: 'Waiting for approval', value: counts.pending },
    { id: 'parentmessages', label: 'Unread messages', value: counts.unread },
    { id: 'leave', label: 'Leave to decide', value: counts.leave },
    { id: 'achievements', label: 'Submissions to review', value: counts.submitted },
  ];

  const actions: [string, string][] = [
    ['publicnotices', 'Publish a notice'],
    ['internal', 'Message staff'],
    ['alerts', 'Raise an emergency alert'],
    ['assignments', 'Assign classes'],
    ['timing', 'Update timings'],
    ['settings', 'School settings'],
  ];

  return (
    <>
      <Panel title="Needs your attention">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onGo(c.id)}
              className="min-w-0 rounded-xl border border-black/10 bg-surface/50 px-3 py-2.5 text-left transition hover:border-navy hover:shadow-card"
            >
              <p className="text-xl font-bold leading-none text-navy">{c.value}</p>
              <p className="mt-1 break-words text-xs font-medium text-text/70">{c.label}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {actions.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onGo(id)}
              className="btn-secondary"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-text/60">
          <Cog className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Use the module buttons above to reach every tool. You can also open the Teacher Dashboard
          to work inside a class — you will keep full principal permissions there.
        </p>
      </Panel>
    </>
  );
}
