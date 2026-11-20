// Text measurements the GPT levels use to detect objectives and score beats.
// Deliberately simple and explainable: no hidden AI judge.

/** Lowercased words (letters and apostrophes), as a reader would count them. */
export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

/** How many times the most repeated n-word phrase occurs. */
export function maxRepeat(text: string, n = 4): number {
  const w = words(text);
  const counts = new Map<string, number>();
  let best = 0;
  for (let i = 0; i + n <= w.length; i++) {
    const k = w.slice(i, i + n).join(' ');
    const c = (counts.get(k) ?? 0) + 1;
    counts.set(k, c);
    if (c > best) best = c;
  }
  return best;
}

/** Share of words that are distinct (1 = no repetition). */
export function distinctRatio(text: string): number {
  const w = words(text);
  return w.length ? new Set(w).size / w.length : 1;
}

/** Distinct lexicon entries found (whole words, or prefixes ending in '*'). */
export function lexiconHits(text: string, lexicon: readonly string[]): string[] {
  const w = new Set(words(text));
  const hits = new Set<string>();
  for (const entry of lexicon) {
    if (entry.endsWith('*')) {
      const stem = entry.slice(0, -1);
      for (const x of w) if (x.startsWith(stem)) hits.add(entry);
    } else if (entry.includes(' ')) {
      if (words(text).join(' ').includes(entry)) hits.add(entry);
    } else if (w.has(entry)) {
      hits.add(entry);
    }
  }
  return [...hits];
}

/** Web-page debris GPT-2 picked up from WebText: the "derail". */
const DERAIL_PATTERNS: [RegExp, string][] = [
  [/https?:\/\/|www\.|\.com\b/i, 'a web address'],
  [/\b(click here|subscribe|sign up|newsletter|advertisement|sponsored)\b/i, 'an ad'],
  [/\b(copyright|all rights reserved|terms of (use|service)|privacy policy)\b/i, 'a page footer'],
  [/\b(posted by|share this|comments?\s*\(\d+\)|read more|related posts?|tags:)\b/i, 'a blog widget'],
  [/\b(follow us|twitter|facebook|instagram|reddit|youtube)\b/i, 'social media'],
  [/\b(tablespoons?|teaspoons?|preheat|oven|ingredients)\b/i, 'a recipe'],
  [/\b(quarterback|touchdown|playoffs|nba|nfl|scored \d+)\b/i, 'sports news'],
  [/\b(the (president|senate|congress)|according to (a|the) (report|study|statement))\b/i, 'the news'],
  [/\b(update|edit):/i, 'a forum edit'],
];

export function derailSignals(text: string): string[] {
  return DERAIL_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
}

/** Count of double-quote characters (straight or curly). */
export function quoteCount(text: string): number {
  return (text.match(/["“”]/g) ?? []).length;
}

/** Share of sentences that end properly: a rough "reads like prose" signal. */
export function sentenceShape(text: string): number {
  const w = words(text).length;
  if (w < 5) return 0;
  const ends = (text.match(/[.!?]["”']?(\s|$)/g) ?? []).length;
  return Math.min(1, ends / Math.max(1, w / 18));
}

/** Simple "number list continues" check: the next number after the prompt's last one appears. */
export function continuesNumbering(prompt: string, output: string): boolean {
  const nums = [...prompt.matchAll(/(\d+)\s*[.)]/g)].map((m) => Number(m[1]));
  if (nums.length < 2) return false;
  const last = nums[nums.length - 1];
  return new RegExp(`(^|\\D)${last + 1}\\s*[.)]`).test(output);
}

const SEQUENCES: string[][] = [
  ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'],
  ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'],
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'],
  'abcdefghijklmnopqrstuvwxyz'.split(''),
];

const OPPOSITES: Record<string, string[]> = {
  big: ['small', 'little'], small: ['big', 'large'], hot: ['cold'], cold: ['hot', 'warm'], up: ['down'], down: ['up'],
  black: ['white'], white: ['black'], day: ['night'], night: ['day'], good: ['bad', 'evil'], bad: ['good'],
  young: ['old'], old: ['young', 'new'], fast: ['slow'], slow: ['fast', 'quick'], happy: ['sad'], sad: ['happy'],
  light: ['dark', 'heavy'], dark: ['light'], in: ['out'], out: ['in'], left: ['right'], right: ['left', 'wrong'],
  yes: ['no'], no: ['yes'], love: ['hate'], hate: ['love'], open: ['closed', 'shut'], high: ['low'], low: ['high'],
  tall: ['short'], short: ['tall', 'long'], long: ['short'], rich: ['poor'], poor: ['rich'], hard: ['soft', 'easy'],
};

/**
 * Did the output continue the prompt's pattern? Recognises counting (words
 * or numbered lists), days, months, letters, and "x and y" opposite pairs.
 */
export function continuesSequence(prompt: string, output: string): boolean {
  if (continuesNumbering(prompt, output)) return true;
  const p = words(prompt);
  const next = words(output)[0];
  if (!next || p.length < 2) return false;
  const last = p[p.length - 1];
  for (const seq of SEQUENCES) {
    const i = seq.indexOf(last);
    // the prompt must already show the sequence (two items in a row)
    if (i > 0 && p[p.length - 2] === seq[i - 1] && seq[i + 1] === next) return true;
    // "chapter one . chapter two . chapter" style: the last item precedes a repeated word
    const j = seq.indexOf(p[p.length - 2]);
    if (j >= 0 && p.filter((x) => x === last).length >= 2 && seq[j + 1] === next) return true;
  }
  // "hot and cold. up and down. big and" -> "small"
  const pairs = prompt.toLowerCase().match(/\b[a-z]+ and [a-z]+\b/g) ?? [];
  if (pairs.length >= 2 && p[p.length - 1] === 'and') {
    const subject = p[p.length - 2];
    if (OPPOSITES[subject]?.includes(next)) return true;
  }
  return false;
}
