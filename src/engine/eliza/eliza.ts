// ELIZA's main loop, ported to TypeScript from Anthony Hay's faithful
// simulation of Joseph Weizenbaum's 1966 program (github.com/anthay/ELIZA,
// CC0-1.0). Behaviour is unchanged; the port adds a report of *why* ELIZA
// said what it said, which the game uses for its objectives.

import { collectTags, SPECIAL_RULE_NONE, type KeywordRule, type MemoryRule, type Tags } from './rules';
import { readScript } from './script';
import { DOCTOR_1966 } from './doctor-1966';
import { elizaUppercase, isDelimiter, join, split } from './text';

/** Where a reply came from. */
export type ReplySource =
  | 'keyword' // a keyword's decomposition/reassembly rule
  | 'memory' // a remembered "MY ..." sentence, replayed
  | 'none' // the script's NONE rule: no keyword found
  | 'nomatch'; // built-in fallback when a script rule fails

export interface ElizaReply {
  /** ELIZA's reply, uppercase, without final punctuation (as in 1966). */
  text: string;
  source: ReplySource;
  /** Keywords found in the clause ELIZA used, highest precedence first. */
  keywords: string[];
  /** The keyword whose rule produced the reply (after any links), if any. */
  keyword?: string;
  /** Every keyword rule tried, in order (links and NEWKEYs included). */
  keywordsTried: string[];
  /** Word substitutions made on the input, e.g. [["MY","YOUR"],["I","YOU"]]. */
  substitutions: [string, string][];
  /** True if the reply re-used some of the user's own words. */
  usedInput: boolean;
  /** A memory formed from this input, if one was. */
  memoryStored?: string;
}

/** The "certain counting mechanism" cycles 1..4; these are its built-in fallbacks. */
const NO_MATCH_MESSAGES = ['PLEASE CONTINUE', 'HMMM', 'GO ON , PLEASE', 'I SEE'];

export class Eliza {
  readonly hello: string;
  private readonly rules: Map<string, KeywordRule>;
  private readonly memory: MemoryRule;
  private readonly tags: Tags;
  private limit = 1;
  private readonly transformationLimit: number;

  constructor(scriptText: string = DOCTOR_1966, transformationLimit = 1000) {
    const script = readScript(scriptText);
    this.hello = join(script.hello);
    this.rules = script.rules;
    this.memory = script.memory;
    this.tags = collectTags(this.rules);
    this.transformationLimit = transformationLimit;
  }

  /** DLIST tags, e.g. FAMILY -> [MOTHER, FATHER, ...]. */
  get tagMap(): ReadonlyMap<string, readonly string[]> {
    return this.tags;
  }

  /** Keywords known to the script (excluding NONE). */
  get keywordList(): string[] {
    return [...this.rules.keys()].filter((k) => k !== SPECIAL_RULE_NONE);
  }

  /** Number of memories waiting to be replayed. */
  get memoryCount(): number {
    return this.memory.memories.length;
  }

  respond(input: string): ElizaReply {
    let words = split(elizaUppercase(input));
    const substitutions: [string, string][] = [];
    const keywordsTried: string[] = [];
    let memoryStored: string | undefined;

    this.limit = (this.limit % 4) + 1;
    const noMatch = (): ElizaReply => ({
      text: NO_MATCH_MESSAGES[this.limit - 1],
      source: 'nomatch',
      keywords,
      keywordsTried,
      substitutions,
      usedInput: false,
      memoryStored,
    });

    // Scan for keywords, clause by clause. The first clause that contains a
    // keyword is used; clauses before it are discarded, clauses after ignored.
    const keystack: string[] = [];
    let topRank = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (isDelimiter(word)) {
        if (keystack.length === 0) {
          words = words.slice(i + 1);
          i = -1;
          substitutions.length = 0;
          continue;
        }
        words = words.slice(0, i);
        break;
      }
      const rule = this.rules.get(word);
      if (rule) {
        if (rule.hasTransformation()) {
          if (rule.precedence > topRank) {
            keystack.unshift(word);
            topRank = rule.precedence;
          } else {
            keystack.push(word);
          }
        }
        const substitute = rule.applyWordSubstitution(word);
        if (substitute !== word) substitutions.push([word, substitute]);
        words[i] = substitute;
      }
    }
    const keywords = [...keystack];

    if (keystack.length === 0 && this.limit === 4 && this.memory.hasMemory()) {
      return {
        text: this.memory.recall(),
        source: 'memory',
        keywords,
        keywordsTried,
        substitutions,
        usedInput: false,
      };
    }

    let transformations = 0;
    while (keystack.length > 0) {
      const key = keystack.shift()!;
      keywordsTried.push(key);
      const rule = this.rules.get(key);
      if (!rule) return noMatch();

      if (this.transformationLimit !== 0 && transformations++ > this.transformationLimit) {
        return { ...noMatch(), text: 'TRANSFORMATION LIMIT REACHED' };
      }

      memoryStored = this.memory.createMemory(key, words, this.tags) ?? memoryStored;

      const result = rule.apply(words, this.tags);
      if (result.action === 'complete') {
        return {
          text: join(result.words),
          source: 'keyword',
          keywords,
          keyword: key,
          keywordsTried,
          substitutions,
          usedInput: result.usedInput,
          memoryStored,
        };
      }
      if (result.action === 'inapplicable') return noMatch();
      if (result.action === 'linkkey') {
        words = result.words;
        keystack.unshift(result.link);
      } else if (keystack.length === 0) {
        break; // NEWKEY with nothing left to try
      }
    }

    const none = this.rules.get(SPECIAL_RULE_NONE)!;
    const result = none.apply(words, this.tags);
    if (result.action !== 'complete') return noMatch();
    return {
      text: join(result.words),
      source: 'none',
      keywords,
      keywordsTried,
      substitutions,
      usedInput: false,
      memoryStored,
    };
  }
}
