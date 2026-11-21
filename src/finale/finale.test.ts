import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ArchiveFile } from '../engine/models/archive';
import { Eliza } from '../engine/eliza';
import { formatTime, wrap } from './certificate';
import { FINALE_CARDS } from './finale';

const archive = (id: 'gpt1' | 'gpt2') =>
  JSON.parse(readFileSync(new URL(`../../public/archive/${id}.json`, import.meta.url), 'utf8')) as ArchiveFile;

describe('finale', () => {
  for (const model of ['gpt1', 'gpt2'] as const) {
    it(`every suggested prompt has ${model} recordings for Archive Mode`, () => {
      const file = archive(model);
      for (const c of FINALE_CARDS) {
        const e = file.entries.find((x) => x.id === c.id);
        expect(e, c.id).toBeDefined();
        expect(e!.prompt).toBe(c.prompt);
        expect(e!.outputs.length).toBeGreaterThanOrEqual(4);
      }
    });
  }

  it('ELIZA has something to say to every suggested prompt', () => {
    for (const c of FINALE_CARDS) expect(new Eliza().respond(c.prompt).text.length).toBeGreaterThan(5);
  });
});

describe('certificate helpers', () => {
  it('formats play time', () => {
    expect(formatTime(42_400)).toBe('42 SEC');
    expect(formatTime(18 * 60_000 + 5_000)).toBe('18 MIN 05 SEC');
  });

  it('wraps text to a column without losing words', () => {
    const lines = wrap('Bella moves to Forks and falls for a vampire who sparkles in the sun', 20);
    expect(lines.every((l) => l.length <= 20)).toBe(true);
    expect(lines.join(' ')).toBe('Bella moves to Forks and falls for a vampire who sparkles in the sun');
  });
});
