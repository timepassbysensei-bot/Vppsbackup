import { describe, expect, it } from 'vitest';
import { inviteStaffSchema, approveTeacherSchema, classNameSchema, sectionNameSchema } from '@/lib/validation/schemas';

const uuid = '11111111-1111-1111-1111-111111111111';

describe('inviteStaffSchema', () => {
  it('accepts a minimal valid invitation', () => {
    const parsed = inviteStaffSchema.safeParse({ email: 'teacher@example.com', full_name: 'Asha Kumar' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.role).toBe('teacher');
  });

  it('rejects an invalid email', () => {
    expect(inviteStaffSchema.safeParse({ email: 'not-an-email', full_name: 'Asha Kumar' }).success).toBe(false);
  });

  it('rejects a too-short name', () => {
    expect(inviteStaffSchema.safeParse({ email: 'a@b.com', full_name: 'A' }).success).toBe(false);
  });

  it('validates class assignments as uuid pairs', () => {
    const ok = inviteStaffSchema.safeParse({
      email: 'a@b.com',
      full_name: 'Asha Kumar',
      classes: [{ class_id: uuid, section_id: null }],
    });
    expect(ok.success).toBe(true);

    const bad = inviteStaffSchema.safeParse({
      email: 'a@b.com',
      full_name: 'Asha Kumar',
      classes: [{ class_id: 'not-a-uuid', section_id: null }],
    });
    expect(bad.success).toBe(false);
  });
});

describe('approveTeacherSchema', () => {
  it('only allows known actions', () => {
    expect(approveTeacherSchema.safeParse({ userId: uuid, action: 'approved' }).success).toBe(true);
    expect(approveTeacherSchema.safeParse({ userId: uuid, action: 'deleted' }).success).toBe(false);
  });
});

describe('class & section name schemas', () => {
  it('trims and bounds names', () => {
    expect(classNameSchema.safeParse('  11  ').success).toBe(true);
    expect(classNameSchema.safeParse('').success).toBe(false);
    expect(sectionNameSchema.safeParse('A').success).toBe(true);
    expect(sectionNameSchema.safeParse('ABCDEFGHI').success).toBe(false);
  });
});
