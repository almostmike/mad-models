import { describe, expect, it } from 'vitest';
import { SOURCES, WINGS } from './museum';

describe('museum', () => {
  const placards = WINGS.flatMap((w) => w.placards);

  it('lists every placard once', () => {
    const ids = placards.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(25);
  });

  it('links only to https sources', () => {
    for (const s of SOURCES.flatMap((g) => g.items)) expect(s.url).toMatch(/^https:\/\//);
  });
});
