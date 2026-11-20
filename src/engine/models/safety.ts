// 13+ content filter for raw model output. GPT-1 and GPT-2 had no safety
// training at all, so the game blocks the worst words while generating and
// redacts anything that slips through, with a period-appropriate gag.
//
// This list is deliberately short and blunt: slurs and explicit sexual
// terms. It is a backstop, not moderation.

const BLOCKED = [
  // slurs
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'fag', 'fags', 'retard', 'retards', 'retarded',
  'kike', 'kikes', 'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks', 'wetback', 'wetbacks', 'tranny',
  'trannies', 'dyke', 'dykes', 'coon', 'coons', 'raghead', 'towelhead', 'beaner', 'beaners',
  // explicit sexual terms
  'fuck', 'fucked', 'fucking', 'fucks', 'cunt', 'cunts', 'cock', 'cocks', 'dick', 'dicks', 'pussy',
  'pussies', 'blowjob', 'blowjobs', 'cum', 'cumming', 'jizz', 'porn', 'porno', 'pornography', 'rape',
  'raped', 'raping', 'rapist', 'masturbate', 'masturbating', 'masturbation', 'orgasm', 'orgasms', 'clit',
  'clitoris', 'penis', 'vagina', 'erection', 'nipples', 'whore', 'whores', 'slut', 'sluts', 'anal',
  'dildo', 'horny', 'incest', 'molest', 'molested', 'pedophile', 'paedophile',
] as const;

export const BLOCKED_WORDS: readonly string[] = BLOCKED;

const pattern = new RegExp(`\\b(${BLOCKED.join('|')})\\b`, 'gi');

/** Blocked words found in the text (lowercased, unique). */
export function findBlocked(text: string): string[] {
  return [...new Set([...text.matchAll(pattern)].map((m) => m[1].toLowerCase()))];
}

export type RedactStyle = 'typewriter' | 'sticker' | 'plain';

/** Replace blocked words: XXXX on a typewriter, a sticker in 2019, or [redacted]. */
export function redact(text: string, style: RedactStyle = 'plain'): { text: string; redacted: boolean } {
  let redacted = false;
  const out = text.replace(pattern, (m) => {
    redacted = true;
    if (style === 'typewriter') return 'X'.repeat(m.length);
    if (style === 'sticker') return '[REDACTED BY SAFETY TEAM]';
    return '[redacted]';
  });
  return { text: out, redacted };
}

/** Player prompts: refuse slurs only (players may write mild romance). */
export function promptAllowed(text: string): boolean {
  return findBlocked(text).length === 0;
}

/**
 * Spellings to block at generation time, as the tokenizer would see them:
 * with and without a leading space, lowercase and capitalized.
 */
export function blockedVariants(lowercase: boolean): string[] {
  const out = new Set<string>();
  for (const w of BLOCKED) {
    const forms = lowercase ? [w] : [w, w[0].toUpperCase() + w.slice(1), w.toUpperCase()];
    for (const f of forms) {
      out.add(f);
      out.add(' ' + f);
    }
  }
  return [...out];
}
