/** IBM 2741 printed about 14.1 characters per second (134.5 bit/s). */
export const CHARS_PER_SECOND = 14.1;

/** Extra pause for a carriage return + line feed. */
export const NEWLINE_PAUSE_MS = 350;

export interface PrintStep {
  char: string;
  /** Milliseconds from the start of printing. */
  at: number;
}

/** Times each character of `text` the way a printing terminal would strike it. */
export function printSchedule(text: string, cps = CHARS_PER_SECOND): PrintStep[] {
  const perChar = 1000 / cps;
  const steps: PrintStep[] = [];
  let t = 0;
  for (const char of text) {
    t += char === '\n' ? NEWLINE_PAUSE_MS : perChar;
    steps.push({ char, at: Math.round(t) });
  }
  return steps;
}
