import { describe, it, expect } from 'vitest';
import {
  admissionSchema,
  parentMessageSchema,
  normalizePhone,
  maskPhone,
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
