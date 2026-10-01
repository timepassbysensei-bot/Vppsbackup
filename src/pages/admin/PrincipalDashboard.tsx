import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  Megaphone,
  Quote,
  Settings,
  ShieldCheck,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminShell, type NavGroup } from '@/app/AdminShell';
import { Panel, Pill } from '@/components/admin/kit';
import { RegistrationsPanel, StaffPanel } from './principal/PeoplePanels';
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

/**
 * Principal dashboard.
 *
 * Groups every module (old + new) behind a responsive sidebar/drawer so nothing
 * is buried at the bottom of one giant page. Each module enforces its own RLS —
 * this component only decides what to render, never what a user may do.
 */
export function PrincipalDashboard() {
  const [active, setActive] = useState('overview');

  const { data: pending } = useQuery({
    queryKey: ['badge-pending'],
    queryFn: async () => {
      const { count: c } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return c ?? 0;
    },
  });
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

  const groups: NavGroup[] = [
    { label: 'Overview', items: [{ id: 'overview', label: 'Dashboard', icon: <LayoutGrid className="h-4 w-4" /> }] },
    {
      label: 'People',
      items: [
        { id: 'registrations', label: 'Registrations', icon: <UserCheck className="h-4 w-4" />, badge: pending },
        { id: 'staff', label: 'Staff roster', icon: <Users className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Academics',
      items: [
        { id: 'timing', label: 'Timing manager', icon: <BarChart3 className="h-4 w-4" /> },
        { id: 'homework', label: 'All homework', icon: <BookOpen className="h-4 w-4" /> },
        { id: 'classnotices', label: 'Class notices', icon: <FileText className="h-4 w-4" /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Communication',
      items: [
        { id: 'parentmessages', label: 'Parent messages', icon: <MessageSquare className="h-4 w-4" />, badge: unread },
        { id: 'leave', label: 'Leave inbox', icon: <ClipboardList className="h-4 w-4" />, badge: leavePending },
        { id: 'internal', label: 'Staff notices', icon: <Megaphone className="h-4 w-4" /> },
        { id: 'alerts', label: 'Emergency alert', icon: <Bell className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Content',
      items: [
        { id: 'publicnotices', label: 'Public notices', icon: <Megaphone className="h-4 w-4" /> },
        { id: 'resources', label: 'Resources', icon: <FileText className="h-4 w-4" /> },
        { id: 'faq', label: 'Chatbot FAQs', icon: <Quote className="h-4 w-4" /> },
      ],
    },
    {
      label: 'Media',
      items: [
        { id: 'gallery', label: 'Gallery', icon: <ImageIcon className="h-4 w-4" /> },
        { id: 'achievements', label: 'Achievements', icon: <Trophy className="h-4 w-4" />, badge: submitted },
      ],
    },
    { label: 'Admissions', items: [{ id: 'admissions', label: 'Enquiries', icon: <ClipboardList className="h-4 w-4" /> }] },
    {
      label: 'Settings',
      items: [
        { id: 'settings', label: 'School settings', icon: <Settings className="h-4 w-4" /> },
        { id: 'audit', label: 'Audit log', icon: <ShieldCheck className="h-4 w-4" /> },
      ],
    },
  ];

  const titles: Record<string, string> = {
    overview: 'Principal dashboard',
    registrations: 'Pending registrations',
    staff: 'Staff roster',
    timing: 'Timing manager',
    homework: 'All homework',
    classnotices: 'All class notices',
    calendar: 'Calendar',
    parentmessages: 'Parent messages',
    leave: 'Leave inbox',
    internal: 'Staff notices',
    alerts: 'Emergency alert',
    publicnotices: 'Public notices',
    resources: 'Resources',
    faq: 'Chatbot FAQs',
    gallery: 'Gallery',
    achievements: 'Achievements',
    admissions: 'Admission enquiries',
    settings: 'School settings',
    audit: 'Audit log',
  };

  return (
    <AdminShell
      title={titles[active] ?? 'Principal dashboard'}
      groups={groups}
      active={active}
      onSelect={setActive}
    >
      {active === 'overview' && (
        <Overview
          onGo={setActive}
          counts={{ pending: pending ?? 0, unread: unread ?? 0, leave: leavePending ?? 0, submitted: submitted ?? 0 }}
        />
      )}
      {active === 'registrations' && <RegistrationsPanel />}
      {active === 'staff' && <StaffPanel />}
      {active === 'timing' && <TimingPanel />}
      {active === 'homework' && <HomeworkAdminPanel />}
      {active === 'classnotices' && <ClassNoticesAdminPanel />}
      {active === 'calendar' && <CalendarPanel />}
      {active === 'parentmessages' && <ParentMessagesPanel />}
      {active === 'leave' && <LeaveInboxPanel />}
      {active === 'internal' && <InternalNoticesPanel />}
      {active === 'alerts' && <EmergencyAlertPanel />}
      {active === 'publicnotices' && <PublicNoticesPanel />}
      {active === 'resources' && <ResourcesPanel />}
      {active === 'faq' && <FaqPanel />}
      {active === 'gallery' && <GalleryPanel />}
      {active === 'achievements' && <AchievementsPanel />}
      {active === 'admissions' && <AdmissionsPanel />}
      {active === 'settings' && <SchoolSettingsPanel />}
      {active === 'audit' && <AuditLogPanel />}
    </AdminShell>
  );
}

function Overview({
  onGo,
  counts,
}: {
  onGo: (id: string) => void;
  counts: { pending: number; unread: number; leave: number; submitted: number };
}) {
  const cards: { id: string; label: string; value: number; hint: string }[] = [
    { id: 'registrations', label: 'Pending registrations', value: counts.pending, hint: 'Accounts awaiting a role' },
    { id: 'parentmessages', label: 'Unread parent messages', value: counts.unread, hint: 'New enquiries from the site' },
    { id: 'leave', label: 'Leave requests', value: counts.leave, hint: 'Awaiting a decision' },
    { id: 'achievements', label: 'Submissions to review', value: counts.submitted, hint: 'Student of the Month' },
  ];

  return (
    <>
      <Panel title="Welcome back" description="Everything you need is grouped in the menu. Start with what needs a decision.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onGo(c.id)}
              className="rounded-xl border border-black/10 bg-surface/50 p-4 text-left transition hover:-translate-y-0.5 hover:border-navy hover:shadow-card"
            >
              <p className="text-3xl font-bold text-navy">{c.value}</p>
              <p className="mt-1 text-sm font-medium text-navy">{c.label}</p>
              <p className="mt-0.5 text-xs text-text/55">{c.hint}</p>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {([
            ['publicnotices', 'Publish a notice'],
            ['internal', 'Message staff'],
            ['alerts', 'Raise emergency alert'],
            ['gallery', 'Manage gallery'],
            ['timing', 'Update timings'],
            ['settings', 'School settings'],
          ] as [string, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onGo(id)}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm text-navy transition hover:border-navy hover:bg-surface"
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3">
          <Pill tone="info">Authorization is enforced by the database, not these buttons.</Pill>
        </p>
      </Panel>
    </>
  );
}
