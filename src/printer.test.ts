import { describe, expect, it } from 'vitest';
import { printSchedule, NEWLINE_PAUSE_MS } from './printer';

describe('printSchedule', () => {
  it('prints one step per character at about 14 cps', () => {
    const steps = printSchedule('HELLO');
    expect(steps.map((s) => s.char).join('')).toBe('HELLO');
    expect(steps[4].at).toBeCloseTo(5 * (1000 / 14.1), -1);
  });

  it('pauses for carriage return', () => {
    const steps = printSchedule('A\nB');
    expect(steps[1].at - steps[0].at).toBe(NEWLINE_PAUSE_MS);
  });
});
