import { describe, it, expect } from 'vitest';
import { pickLocalized } from '@/lib/i18n';
import en from '@/lib/i18n/en.json';
import hi from '@/lib/i18n/hi.json';

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

/** Flattens a nested translation object into dotted leaf keys. */
function leafKeys(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') return prefix ? [prefix] : [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? leafKeys(value, full) : [full];
  });
}

/**
 * The site is bilingual (English/Hindi) and the language switcher is always
 * visible, so a key that exists in only one locale renders a raw key or an
 * English string inside Hindi mode. This keeps the two files in lockstep.
 */
describe('translation key parity (en vs hi)', () => {
  const enKeys = leafKeys(en);
  const hiKeys = leafKeys(hi);

  it('has no key that is missing from Hindi', () => {
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([]);
  });

  it('has no key that is missing from English', () => {
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });
});
