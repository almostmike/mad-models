import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ArchiveFile } from '../engine/models/archive';
import { GPT1_CARDS, GPT1_OBJECTIVES } from './gpt1/content';
import { attackIn, BEATS, fillHint, judge, type Team } from './gpt2/content';

const archive = (id: 'gpt1' | 'gpt2') =>
  JSON.parse(readFileSync(new URL(`../../public/archive/${id}.json`, import.meta.url), 'utf8')) as ArchiveFile;

describe('Level 2 (GPT-1) in Archive Mode', () => {
  const file = archive('gpt1');
  const entry = (id: string) => file.entries.find((e) => e.id === id)!;

  it('has a recording for every prompt card', () => {
    for (const c of GPT1_CARDS) expect(entry(c.id), c.id).toBeDefined();
  });

  // Each visible objective must be clearable from some card's recordings,
  // or an Archive Mode player could get stuck.
  for (const o of GPT1_OBJECTIVES.filter((x) => !x.hidden)) {
    it(`"${o.title}" can be cleared from the recordings`, () => {
      const ok = file.entries.some((e) =>
        e.outputs.some((output, i) => o.detect({ prompt: e.prompt, output, temperature: e.temperature, index: i + 1 })),
      );
      expect(ok).toBe(true);
    });
  }

  it('the naive sea prompt fails more often than the primed one', () => {
    const sea = GPT1_OBJECTIVES.find((o) => o.id === 'sea')!;
    const rate = (id: string) =>
      entry(id).outputs.filter((output) => sea.detect({ prompt: entry(id).prompt, output, temperature: 0.8, index: 2 })).length;
    expect(rate('sea-primed')).toBeGreaterThan(rate('sea-naive'));
  });
});

describe('Level 3 (GPT-2 boss) in Archive Mode', () => {
  const file = archive('gpt2');
  for (const team of ['edward', 'jacob'] as Team[]) {
    for (const beat of BEATS) {
      it(`${beat.id} (${team}): the strong card can pass and the weak one teaches`, () => {
        const [weak, strong] = beat.cards(team).map((c) => file.entries.find((e) => e.id === c.id)!);
        expect(weak, 'weak card recorded').toBeDefined();
        expect(strong, 'strong card recorded').toBeDefined();
        const passes = (e: typeof strong) =>
          e.outputs.filter((output) => judge(beat, { prompt: e.prompt, output, temperature: e.temperature, team }).pass).length;
        expect(passes(strong)).toBeGreaterThan(0);
        expect(passes(strong)).toBeGreaterThan(passes(weak));
      });
    }
  }
});

describe('GPT-2 attacks', () => {
  const a = (output: string, temperature = 0.8) => attackIn({ prompt: '', output, temperature, team: 'edward' });
  it('derail, loop, identity crisis, babble', () => {
    expect(a('Share this on Facebook!')?.attack).toBe('derail');
    expect(a('Bella loved Edward. Bella loved Edward. Bella loved Edward. Bella loved Edward.')?.attack).toBe('loop');
    expect(a('And then Bella kissed Bella in the rain.')?.attack).toBe('identity');
    expect(a('anything at all', 1.6)?.attack).toBe('babble');
    expect(a('Edward looked at Bella in the rain.')).toBeNull();
  });
  it('fills rival hints per team', () => {
    expect(fillHint('{rival}: "{line1}"', 'edward')).toContain('Jacob: "Bella, he is a vampire.');
    expect(fillHint('{rival}: "{line1}"', 'jacob')).toContain('Edward: "I have waited');
  });
});
