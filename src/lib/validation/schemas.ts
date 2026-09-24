import { z } from 'zod';

/**
 * Shared validation schemas. Imported by BOTH the React forms and the Netlify
 * Functions so the client and server enforce identical rules. Keep this file
 * free of any browser- or node-specific imports.
 */

const uuid = z.string().uuid();

// Indian phone numbers: optional +91, then 10 digits. We store the normalized
// value; see normalizePhone.
const phone = z
  .string()
  .trim()
  .min(10)
  .max(20)
  .regex(/^[+]?[\d\s-]{10,20}$/, 'invalid_phone');

const shortText = z.string().trim().min(1).max(120);
const longText = z.string().trim().min(1).max(2000);

export const admissionSchema = z.object({
  student_name: shortText,
  guardian_name: shortText,
  phone,
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  class_applying: z.string().trim().min(1).max(20),
  current_school: z.string().trim().max(160).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
  consent: z.literal(true),
  turnstileToken: z.string().min(1).max(2048),
});
export type AdmissionInput = z.infer<typeof admissionSchema>;

export const parentMessageSchema = z.object({
  student_name: shortText,
  sender_name: shortText,
  phone,
  class_id: uuid.optional(),
  section_id: uuid.optional(),
  body: longText,
  turnstileToken: z.string().min(1).max(2048),
});
export type ParentMessageInput = z.infer<typeof parentMessageSchema>;

export const senseiChatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(12)
    .optional()
    .default([]),
  lang: z.enum(['en', 'hi']).optional().default('en'),
  turnstileToken: z.string().min(1).max(2048),
});
export type SenseiChatInput = z.infer<typeof senseiChatSchema>;

/**
 * Auth schemas (e-mail + password only — the project deliberately has NO OAuth
 * provider). Shared with the React forms so validation is identical everywhere.
 */
export const emailField = z.string().trim().min(3).max(160).email();

/** Supabase's own minimum is 6; we ask for 8 and cap at 72 (bcrypt limit). */
export const passwordField = z.string().min(8).max(72);

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(72),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120),
    email: emailField,
    password: passwordField,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'password_mismatch' });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const resetRequestSchema = z.object({ email: emailField });
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

export const newPasswordSchema = z
  .object({ password: passwordField, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'password_mismatch' });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/**
 * Classes & sections management (principal only; RLS enforces the write).
 * A class name is a short label such as "11", "Nursery" or "LKG".
 */
export const classNameSchema = z.string().trim().min(1).max(20);
export const sectionNameSchema = z.string().trim().min(1).max(8);

export const approveTeacherSchema = z.object({
  userId: uuid,
  action: z.enum(['approved', 'rejected', 'suspended']),
  role: z.enum(['teacher', 'principal']).optional(),
  perms: z
    .object({
      can_public_notices: z.boolean().optional(),
      can_birthdays: z.boolean().optional(),
      can_resources: z.boolean().optional(),
      can_spotlight: z.boolean().optional(),
    })
    .optional(),
  classes: z
    .array(z.object({ class_id: uuid, section_id: uuid.nullable() }))
    .max(50)
    .optional(),
});
export type ApproveTeacherInput = z.infer<typeof approveTeacherSchema>;

// Buckets that hold private files. signed-file only ever mints URLs for these.
export const PRIVATE_BUCKETS = [
  'resources-private',
  'parent-attachments',
  'leave-attachments',
  'internal-notices',
] as const;

export const signedFileSchema = z.object({
  bucket: z.enum(PRIVATE_BUCKETS),
  path: z.string().min(1).max(300),
});
export type SignedFileInput = z.infer<typeof signedFileSchema>;

/** Normalizes an Indian phone number to a compact +91XXXXXXXXXX form when possible. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (raw.trim().startsWith('+')) return `+${digits}`;
  return digits;
}

/** Masks a phone number for preview cards, e.g. +91 98•••••210. */
export function maskPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length < 4) return '•••';
  const tail = digits.slice(-3);
  return `••••••${tail}`;
}
