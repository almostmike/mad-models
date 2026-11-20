// ELIZA's pattern matching and transformation rules, ported to TypeScript
// from Anthony Hay's faithful simulation of the 1966 program
// (github.com/anthay/ELIZA, CC0-1.0). Page numbers refer to Weizenbaum's
// January 1966 CACM paper.

import { hash, join, lastChunkAsBcd, split, toInt } from './text';

/** Tag name -> keywords carrying that tag, e.g. FAMILY -> [MOTHER, FATHER, ...]. */
export type Tags = Map<string, string[]>;

/** Keyword used internally for the script's NONE rule. */
export const SPECIAL_RULE_NONE = 'zNONE';

/**
 * Is `word` in a pattern group?  "(*SAD HAPPY DEPRESSED)" lists words;
 * "(/FAMILY)" names DLIST tags.
 */
export function inList(word: string, wordlist: string, tags: Tags): boolean {
  let list = wordlist;
  if (list.endsWith(')')) list = list.slice(0, -1);
  if (list.startsWith('(')) list = list.substring(1);
  list = list.trim();

  if (list.startsWith('*')) {
    // Recreates a quirk of the original SLIP YMATCH: words are compared
    // in 6-character chunks, so only the first 6 characters of `word` count.
    const word6 = word.substring(0, 6);
    for (const w of list.substring(1).trim().split(' ')) {
      for (let i = 0; i < w.length; i += 6) {
        if (w.substring(i, i + 6) === word6) return true;
      }
    }
    return false;
  }
  if (list.startsWith('/')) {
    for (const tag of list.substring(1).trim().split(' ')) {
      if (tags.get(tag)?.includes(word)) return true;
    }
  }
  return false;
}

/**
 * Match `words` against a decomposition pattern. Returns the matched
 * components (one per pattern element) or null.
 *
 * Pattern elements: a literal word, a group "(* A B)" / "(/TAG)",
 * 0 (any number of words) or n > 0 (exactly n words).
 */
export function match(tags: Tags, pattern: readonly string[], words: readonly string[]): string[] | null {
  if (pattern.length === 0) return words.length === 0 ? [] : null;

  const [patword, ...restPattern] = pattern;
  const n = toInt(patword);

  if (n < 0) {
    if (words.length === 0) return null;
    const [current, ...restWords] = words;
    if (patword.startsWith('(')) {
      if (!inList(current, patword, tags)) return null;
    } else if (patword !== current) {
      return null;
    }
    const mc = match(tags, restPattern, restWords);
    return mc ? [current, ...mc] : null;
  }

  if (n === 0) {
    // Shortest match first, as in the original.
    for (let take = 0; take <= words.length; take++) {
      const mc = match(tags, restPattern, words.slice(take));
      if (mc) return [join(words.slice(0, take)), ...mc];
    }
    return null;
  }

  if (words.length < n) return null;
  const mc = match(tags, restPattern, words.slice(n));
  return mc ? [join(words.slice(0, n)), ...mc] : null;
}

/** Build a reply from a reassembly rule, e.g. (ARE YOU 1) + [MAD] -> ARE YOU MAD. */
export function reassemble(rule: readonly string[], components: readonly string[]): string[] {
  const result: string[] = [];
  for (const r of rule) {
    const n = toInt(r);
    if (n < 0) result.push(r);
    else if (n === 0 || n > components.length) result.push('HMMM'); // can't happen: checked when the script loads
    else result.push(...split(components[n - 1]));
  }
  return result;
}

/** Does the reassembly rule copy any of the user's own (non-empty) words? */
export function usesComponents(rule: readonly string[], components: readonly string[]): boolean {
  return rule.some((r) => {
    const n = toInt(r);
    return n > 0 && n <= components.length && components[n - 1].trim() !== '';
  });
}

export function reassemblyIndexesValid(decomposition: readonly string[], reassembly: readonly string[]): string | null {
  for (const r of reassembly) {
    const n = toInt(r);
    if (n < 0) continue;
    if (n === 0 || n > decomposition.length) {
      return `reassembly index '${n}' out of range [1..${decomposition.length}]`;
    }
  }
  return null;
}

export interface Transform {
  decomposition: string[];
  reassemblyRules: string[][];
  /** Reassembly rules are used in rotation [page 39]. */
  next: number;
}

export type TransformResult =
  | { action: 'inapplicable' }
  | { action: 'newkey' }
  | { action: 'linkkey'; words: string[]; link: string }
  | { action: 'complete'; words: string[]; decomposition: string[]; reassembly: string[]; usedInput: boolean };

export class KeywordRule {
  readonly transforms: Transform[] = [];
  readonly keyword: string;
  readonly wordSubstitution: string;
  readonly precedence: number;
  readonly tags: string[];
  readonly linkKeyword: string;

  constructor(keyword: string, wordSubstitution = '', precedence = 0, tags: string[] = [], linkKeyword = '') {
    this.keyword = keyword;
    this.wordSubstitution = wordSubstitution;
    this.precedence = precedence;
    this.tags = tags;
    this.linkKeyword = linkKeyword;
  }

  addTransform(decomposition: string[], reassemblyRules: string[][]): void {
    this.transforms.push({ decomposition, reassemblyRules, next: 0 });
  }

  applyWordSubstitution(word: string): string {
    return this.wordSubstitution && word === this.keyword ? this.wordSubstitution : word;
  }

  hasTransformation(): boolean {
    return this.transforms.length > 0 || !!this.linkKeyword;
  }

  apply(words: string[], tags: Tags): TransformResult {
    let rule: Transform | undefined;
    let components: string[] | null = null;
    for (const t of this.transforms) {
      components = match(tags, t.decomposition, words);
      if (components) {
        rule = t;
        break;
      }
    }

    if (!rule || !components) {
      if (!this.linkKeyword) return { action: 'inapplicable' }; // [page 39 (f)]
      return { action: 'linkkey', words, link: this.linkKeyword };
    }

    const reassembly = rule.reassemblyRules[rule.next];
    rule.next = (rule.next + 1) % rule.reassemblyRules.length;

    if (reassembly.length === 1 && reassembly[0] === 'NEWKEY') return { action: 'newkey' };
    if (reassembly.length === 2 && reassembly[0] === '=') {
      return { action: 'linkkey', words, link: reassembly[1] };
    }

    // Special case ( PRE ( reassembly ) ( =reference ) ), stored flat.
    if (reassembly.length !== 0 && reassembly[0] === '(') {
      const inner: string[] = [];
      let i = 3; // skip '(' 'PRE' '('
      while (reassembly[i] !== ')') inner.push(reassembly[i++]);
      i += 3; // skip ')' '(' '='
      return { action: 'linkkey', words: reassemble(inner, components), link: reassembly[i] };
    }

    return {
      action: 'complete',
      words: reassemble(reassembly, components),
      decomposition: rule.decomposition,
      reassembly,
      usedInput: usesComponents(reassembly, components),
    };
  }
}

/** The MEMORY rule: remembers things said about "MY ..." for later [page 41]. */
export class MemoryRule {
  keyword = '';
  readonly transforms: Transform[] = [];
  readonly memories: string[] = [];

  addTransform(decomposition: string[], reassemblyRules: string[][]): void {
    this.transforms.push({ decomposition, reassemblyRules, next: 0 });
  }

  /** Returns the new memory, if one was formed. */
  createMemory(keyword: string, words: string[], tags: Tags): string | null {
    if (keyword !== this.keyword || words.length === 0) return null;
    // Weizenbaum's paper says the rule is chosen at random, but the
    // original code hashes the last word of the input [page 41 (f)].
    const t = this.transforms[hash(lastChunkAsBcd(words[words.length - 1]), 2)];
    const components = match(tags, t.decomposition, words);
    if (!components) return null;
    const memory = join(reassemble(t.reassemblyRules[0], components));
    this.memories.push(memory);
    return memory;
  }

  hasMemory(): boolean {
    return this.memories.length > 0;
  }

  recall(): string {
    return this.memories.shift() ?? '';
  }
}

export function collectTags(rules: Map<string, KeywordRule>): Tags {
  const tags: Tags = new Map();
  for (const [key, rule] of rules) {
    for (const t of rule.tags) {
      if (!tags.has(t)) tags.set(t, []);
      tags.get(t)!.push(key);
    }
  }
  return tags;
}
