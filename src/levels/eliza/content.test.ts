import { describe, expect, it } from 'vitest';
import { Eliza } from '../../engine/eliza';
import { OBJECTIVES } from './content';

/** The explicit hint ("Type: ...") must actually clear its objective. */
function typedLines(hint: string): string[] {
  return [...hint.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

describe('Level 1 objectives', () => {
  for (const o of OBJECTIVES.filter((x) => x.detect)) {
    it(`"${o.title}" is cleared by its "Try it" example`, () => {
      const eliza = new Eliza();
      const lines = o.example!.steps;
      // "Try it" repeats the last step
      const script = [...lines, ...Array(3).fill(lines[lines.length - 1])];
      expect(script.some((line) => o.detect!(eliza.respond(line)))).toBe(true);
      // and the explicit hint names the same lines
      expect(typedLines(o.hints[2])).toEqual(lines);
    });

    it(`"${o.title}" is cleared by following its explicit hint`, () => {
      const eliza = new Eliza();
      const lines = typedLines(o.hints[2]);
      expect(lines.length).toBeGreaterThan(0);
      // "type X a few times": repeat the last line up to four times
      const script = [...lines, ...Array(3).fill(lines[lines.length - 1])];
      const hit = script.some((line) => o.detect!(eliza.respond(line)));
      expect(hit).toBe(true);
    });
  }

  it('does not clear the family objective without "my"', () => {
    const family = OBJECTIVES.find((o) => o.id === 'family')!;
    expect(family.detect!(new Eliza().respond('Mother never listens.'))).toBe(false);
  });

  it('does not count stock NONE replies as reflection', () => {
    const reflect = OBJECTIVES.find((o) => o.id === 'reflect')!;
    expect(reflect.detect!(new Eliza().respond('Bananas.'))).toBe(false);
  });
});
