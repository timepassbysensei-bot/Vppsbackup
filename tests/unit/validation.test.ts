import { describe, it, expect } from 'vitest';
import {
  admissionSchema,
  parentMessageSchema,
  normalizePhone,
  maskPhone,
  classNameSchema,
  newPasswordSchema,
  resetRequestSchema,
  sectionNameSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/validation/schemas';

describe('phone helpers', () => {
  it('normalizes a 10-digit Indian number to +91 form', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
  });
  it('keeps an already prefixed +91 number', () => {
    expect(normalizePhone('+91 9876543210')).toBe('+919876543210');
  });
  it('masks all but the last three digits', () => {
    expect(maskPhone('+919876543210')).toBe('••••••210');
  });
});

describe('admissionSchema', () => {
  const base = {
    student_name: 'A',
    guardian_name: 'B',
    phone: '9876543210',
    class_applying: '1',
    consent: true,
    turnstileToken: 'x',
  };
  it('accepts a valid payload', () => {
    expect(admissionSchema.safeParse(base).success).toBe(true);
  });
  it('requires consent to be exactly true', () => {
    expect(admissionSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it('rejects a missing turnstile token', () => {
    const { turnstileToken, ...rest } = base;
    void turnstileToken;
    expect(admissionSchema.safeParse(rest).success).toBe(false);
  });
});

describe('parentMessageSchema', () => {
  it('rejects an empty body', () => {
    const res = parentMessageSchema.safeParse({
      student_name: 'A',
      sender_name: 'B',
      phone: '9876543210',
      body: '',
      turnstileToken: 'x',
    });
    expect(res.success).toBe(false);
  });
});

// Auth is e-mail + password only — there is no OAuth provider in this project.
describe('signInSchema', () => {
  it('accepts an e-mail and a non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'teacher@school.edu', password: 'x' }).success).toBe(true);
  });

  it('trims surrounding whitespace from the e-mail', () => {
    const res = signInSchema.safeParse({ email: '  teacher@school.edu  ', password: 'x' });
    expect(res.success && res.data.email).toBe('teacher@school.edu');
  });

  it('rejects a malformed e-mail', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(signInSchema.safeParse({ email: 'teacher@school.edu', password: '' }).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const base = { full_name: 'A Teacher', email: 't@school.edu', password: 'longenough', confirm: 'longenough' };

  it('accepts a valid registration', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });

  it('requires the password to be at least 8 characters', () => {
    expect(signUpSchema.safeParse({ ...base, password: 'short12', confirm: 'short12' }).success).toBe(false);
  });

  it('caps the password at 72 characters (bcrypt limit)', () => {
    const long = 'a'.repeat(73);
    expect(signUpSchema.safeParse({ ...base, password: long, confirm: long }).success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    expect(signUpSchema.safeParse({ ...base, confirm: 'different' }).success).toBe(false);
  });

  it('rejects an empty full name', () => {
    expect(signUpSchema.safeParse({ ...base, full_name: '' }).success).toBe(false);
  });
});

describe('password reset schemas', () => {
  it('resetRequestSchema requires a valid e-mail', () => {
    expect(resetRequestSchema.safeParse({ email: 't@school.edu' }).success).toBe(true);
    expect(resetRequestSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('newPasswordSchema enforces the same rules as signup', () => {
    expect(newPasswordSchema.safeParse({ password: 'longenough', confirm: 'longenough' }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: 'longenough', confirm: 'other' }).success).toBe(false);
  });
});

// Classes & sections are principal-managed reference data, not free text.
describe('class & section name schemas', () => {
  it('accepts a short class label', () => {
    expect(classNameSchema.safeParse('11').success).toBe(true);
    expect(classNameSchema.safeParse('Nursery').success).toBe(true);
  });

  it('rejects a blank or over-long class label', () => {
    expect(classNameSchema.safeParse('   ').success).toBe(false);
    expect(classNameSchema.safeParse('x'.repeat(21)).success).toBe(false);
  });

  it('rejects a blank or over-long section label', () => {
    expect(sectionNameSchema.safeParse('A').success).toBe(true);
    expect(sectionNameSchema.safeParse('').success).toBe(false);
    expect(sectionNameSchema.safeParse('x'.repeat(9)).success).toBe(false);
  });
});
