import { describe, it, expect } from 'vitest';
import { isAutomaticAdmissionOpen } from '@/lib/time';

describe('automatic admissions window (Asia/Kolkata)', () => {
  it('is open in December', () => {
    expect(isAutomaticAdmissionOpen(new Date('2025-12-15T12:00:00Z'))).toBe(true);
  });
  it('is open in April', () => {
    expect(isAutomaticAdmissionOpen(new Date('2026-04-15T12:00:00Z'))).toBe(true);
  });
  it('is closed in July', () => {
    expect(isAutomaticAdmissionOpen(new Date('2026-07-15T12:00:00Z'))).toBe(false);
  });
  it('is closed in November', () => {
    expect(isAutomaticAdmissionOpen(new Date('2026-11-15T12:00:00Z'))).toBe(false);
  });
});
