import { describe, it, expect } from 'vitest';
import { pickLocalized } from '@/lib/i18n';

describe('pickLocalized', () => {
  it('returns Hindi when present and requested', () => {
    const r = pickLocalized('hi', 'Hello', 'नमस्ते');
    expect(r).toEqual({ text: 'नमस्ते', fellBack: false });
  });

  it('falls back to English (and flags it) when Hindi is missing', () => {
    const r = pickLocalized('hi', 'Hello', null);
    expect(r).toEqual({ text: 'Hello', fellBack: true });
  });

  it('never flags a fallback in English mode', () => {
    const r = pickLocalized('en', 'Hello', 'नमस्ते');
    expect(r).toEqual({ text: 'Hello', fellBack: false });
  });

  it('treats whitespace-only Hindi as missing', () => {
    const r = pickLocalized('hi', 'Hello', '   ');
    expect(r.fellBack).toBe(true);
  });
});
