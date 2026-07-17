/** Minimal shared row types for the public surface. Not exhaustive. */

export interface SchoolSettings {
  id: string;
  name_en: string | null;
  name_hi: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  office_hours: string | null;
  established_year: number | null;
  principal_name: string | null;
  affiliation: string | null;
  affiliation_number: string | null;
  facilities: Facility[];
  facebook_url: string | null;
  instagram_url: string | null;
  map_url: string | null;
  admission_mode: 'automatic' | 'open' | 'closed';
  public_fee_message: string | null;
  homepage_intro_en: string | null;
  homepage_intro_hi: string | null;
  about_en: string | null;
  about_hi: string | null;
  mission_en: string | null;
  mission_hi: string | null;
  vision_en: string | null;
  vision_hi: string | null;
  principal_message_en: string | null;
  principal_message_hi: string | null;
  privacy_contact: string | null;
  default_language: 'en' | 'hi';
  homework_retention_days: number;
}

export interface Facility {
  key: string;
  label_en: string;
  label_hi: string;
  icon: string;
}

export interface PublicNotice {
  id: string;
  title_en: string;
  title_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
  content_en: string | null;
  content_hi: string | null;
  category: string;
  priority: 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  is_urgent: boolean;
  effective_date: string | null;
  expiry_date: string | null;
  attachment_path: string | null;
}

export interface CalendarEvent {
  id: string;
  title_en: string;
  title_hi: string | null;
  desc_en: string | null;
  desc_hi: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
}

export interface TimingSchedule {
  id: string;
  name: string;
  morning_start: string | null;
  morning_end: string | null;
  day_start: string | null;
  day_end: string | null;
  state: string;
}

export interface Spotlight {
  id: string;
  award_title: string;
  display_name: string;
  photo_path: string | null;
  writeup_en: string | null;
  writeup_hi: string | null;
  month: number | null;
  year: number | null;
}

export interface BirthdayDisplay {
  display_name: string;
  class_name: string | null;
  section_name: string | null;
  greeting_en: string | null;
  greeting_hi: string | null;
  photo_path: string | null;
  publish_mode: 'text_only' | 'with_photo';
}

export type AppRole = 'principal' | 'teacher';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserRole {
  user_id: string;
  role: AppRole;
  status: ApprovalStatus;
}
