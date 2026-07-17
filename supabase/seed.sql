-- =============================================================================
-- seed.sql — View Point Public School
--
-- Section A: VERIFIED FACTS (safe for production). These are the confirmed
--   facts from the blueprint's single source of truth. Unknown/unconfirmed
--   values (CBSE affiliation number, WhatsApp, final domain, map URL,
--   principal's message text) are intentionally left NULL/blank and must be
--   filled in by the principal from the admin dashboard — never fabricated.
--
-- Section B: DEMO CONTENT (development only). Clearly marked "[DEMO]" and left
--   UNPUBLISHED. Do NOT load Section B into production. It contains no real
--   children's names or photos.
-- =============================================================================

-- =============================================================================
-- SECTION A — VERIFIED FACTS
-- =============================================================================

-- Classes ---------------------------------------------------------------------
insert into classes (name, requires_section, sort_order) values
  ('Nursery', false, 0),
  ('1', true, 1), ('2', true, 2), ('3', true, 3), ('4', true, 4), ('5', true, 5),
  ('6', true, 6), ('7', true, 7), ('8', true, 8), ('9', true, 9), ('10', true, 10)
on conflict (name) do nothing;

-- Sections A & B for every class that requires a section (Nursery excluded).
insert into sections (class_id, name)
  select c.id, s.n from classes c cross join (values ('A'), ('B')) s(n)
  where c.requires_section
on conflict (class_id, name) do nothing;

-- School settings (single row) ------------------------------------------------
-- affiliation_number is NULL on purpose (UNKNOWN). map_url is NULL (unconfirmed).
-- principal_message_* left NULL so the UI shows a neutral placeholder.
insert into school_settings (
  name_en, name_hi, tagline,
  address, phone, email, office_hours,
  established_year, principal_name,
  affiliation, affiliation_number,
  facilities,
  facebook_url, instagram_url, map_url,
  admission_mode, public_fee_message,
  default_language, homework_retention_days
) values (
  'View Point Public School',
  'व्यू पॉइंट पब्लिक स्कूल',
  'Learning Today. Leading Tomorrow.',
  'Ram Nagar Colony, Chas, Bokaro, Jharkhand 827013, India',
  '+91 6542796840',
  'viewpointpublicschool@gmail.com',
  'Monday–Friday, 6:00 AM – 3:30 PM',
  1992,
  'Bikash Ojha',
  'CBSE',
  null,                       -- CBSE affiliation number: UNKNOWN, editable
  '[
    {"key":"library","label_en":"Library","label_hi":"पुस्तकालय","icon":"library-big"},
    {"key":"computer_lab","label_en":"Computer Laboratory","label_hi":"कंप्यूटर प्रयोगशाला","icon":"monitor"},
    {"key":"science_lab","label_en":"Science Laboratory","label_hi":"विज्ञान प्रयोगशाला","icon":"flask-conical"},
    {"key":"playground","label_en":"Playground","label_hi":"खेल का मैदान","icon":"trees"},
    {"key":"transport","label_en":"School Transport","label_hi":"विद्यालय परिवहन","icon":"bus"},
    {"key":"cctv","label_en":"CCTV and Security","label_hi":"सीसीटीवी एवं सुरक्षा","icon":"shield-check"},
    {"key":"drinking_water","label_en":"Clean Drinking Water","label_hi":"स्वच्छ पेयजल","icon":"droplets"}
  ]'::jsonb,
  'https://www.facebook.com/p/View-Point-Public-School-Chas-100063558201930/',
  'https://www.instagram.com/viewpointpublicschoolchas/',
  null,                       -- map URL: unconfirmed
  'automatic',
  'For fee information, please contact the school office directly.',
  'en',
  7
);

-- Branding asset slots (paths filled in when the principal uploads images).
insert into branding_assets (key, storage_path) values
  ('logo', null), ('favicon', null), ('hero', null),
  ('principal_photo', null), ('about_photo', null),
  ('og_image', null), ('fallback', null)
on conflict (key) do nothing;

-- Chatbot config --------------------------------------------------------------
insert into chatbot_settings (enabled, disclaimer) values (
  true,
  'Please confirm important information directly with the school office.'
);

-- Current active timing schedule ----------------------------------------------
-- Morning 6:00–10:00 AM → Nursery, Classes 1–3, 9–10.
-- Day 10:10 AM–3:30 PM → Classes 4–8.
with s as (
  insert into timing_schedules
    (name, morning_start, morning_end, day_start, day_end, state, is_override)
  values
    ('Current Schedule', '06:00', '10:00', '10:10', '15:30', 'active', false)
  returning id
)
insert into timing_shift_assignments (schedule_id, class_id, shift)
select s.id, c.id,
  case when c.name in ('Nursery', '1', '2', '3', '9', '10') then 'morning' else 'day' end
from s cross join classes c;

-- =============================================================================
-- SECTION B — DEMO CONTENT (development only; DO NOT run in production)
-- All rows are UNPUBLISHED and prefixed "[DEMO]". No real children's data.
-- =============================================================================

-- Demo public notices (unpublished).
insert into public_notices
  (title_en, title_hi, summary_en, category, priority, audience, is_published)
values
  ('[DEMO] Annual Sports Day', '[DEMO] वार्षिक खेल दिवस',
   'Placeholder demo notice. Not published.', 'Event', 'normal', 'public', false),
  ('[DEMO] Winter Break Schedule', null,
   'Placeholder demo notice. Not published.', 'Holiday', 'normal', 'public', false);

-- Demo calendar event (unpublished).
insert into calendar_events
  (title_en, event_type, start_date, all_day, visibility, is_published)
values
  ('[DEMO] Parent–Teacher Meeting', 'Parent Meeting', current_date + 14, true, 'public', false);

-- Demo chatbot FAQ (safe, factual, public info only).
insert into chatbot_faqs (topic, question_en, answer_en, question_hi, answer_hi) values
  ('office_hours',
   'What are the school office hours?',
   'The school office is open Monday to Friday, 6:00 AM to 3:30 PM.',
   'विद्यालय कार्यालय का समय क्या है?',
   'विद्यालय कार्यालय सोमवार से शुक्रवार, सुबह 6:00 बजे से दोपहर 3:30 बजे तक खुला रहता है।'),
  ('contact',
   'How can I contact the school?',
   'You can call +91 6542796840 or email viewpointpublicschool@gmail.com. For fee information, please contact the school office directly.',
   'मैं विद्यालय से कैसे संपर्क करूँ?',
   'आप +91 6542796840 पर कॉल कर सकते हैं या viewpointpublicschool@gmail.com पर ईमेल कर सकते हैं। शुल्क संबंधी जानकारी के लिए कृपया सीधे विद्यालय कार्यालय से संपर्क करें।');
