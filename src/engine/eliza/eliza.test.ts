import { describe, expect, it } from 'vitest';
import { Eliza } from './eliza';
import { CACM_1966, CONTINUATION_2023 } from './conversations.fixture';
import { match } from './rules';
import { elizaUppercase, hash, lastChunkAsBcd, split } from './text';

describe('ELIZA fidelity: the conversation printed in the January 1966 CACM paper', () => {
  it('opens with the original greeting', () => {
    expect(new Eliza().hello).toBe('HOW DO YOU DO. PLEASE TELL ME YOUR PROBLEM');
  });

  it('reproduces every published reply exactly', () => {
    const eliza = new Eliza();
    for (const [input, expected] of CACM_1966) {
      expect(eliza.respond(input).text, `input: ${input}`).toBe(expected);
    }
  });

  it("continues identically to Anthony Hay's reference simulation", () => {
    const eliza = new Eliza();
    for (const [input] of CACM_1966) eliza.respond(input);
    for (const [input, expected] of CONTINUATION_2023) {
      expect(eliza.respond(input).text, `input: ${input}`).toBe(expected);
    }
  });
});

describe('reply reports (used by the game objectives)', () => {
  it('reports the FAMILY keyword path', () => {
    const r = new Eliza().respond('Perhaps I could learn to get along with my mother.');
    expect(r.source).toBe('keyword');
    expect(r.text).toBe('TELL ME MORE ABOUT YOUR FAMILY');
    expect(r.keywordsTried).toContain('MY');
  });

  it('reports pronoun reflection', () => {
    const r = new Eliza().respond('Well, my boyfriend made me come here.');
    expect(r.text).toBe('YOUR BOYFRIEND MADE YOU COME HERE');
    expect(r.usedInput).toBe(true);
    expect(r.substitutions).toContainEqual(['MY', 'YOUR']);
    expect(r.substitutions).toContainEqual(['ME', 'YOU']);
  });

  it('stores and later replays a memory', () => {
    const eliza = new Eliza();
    let stored: string | undefined;
    let replayed = false;
    for (const [input] of CACM_1966) {
      const r = eliza.respond(input);
      stored ??= r.memoryStored;
      if (r.source === 'memory') replayed = true;
    }
    expect(stored).toBe('DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR BOYFRIEND MADE YOU COME HERE');
    expect(replayed).toBe(true);
  });

  it('falls back to the NONE rule when there is no keyword', () => {
    const r = new Eliza().respond('Bullies.');
    expect(r.source).toBe('none');
    expect(r.keywords).toEqual([]);
  });

  it('answers questions about computers with the COMPUTER rule', () => {
    const r = new Eliza().respond('Are you a computer?');
    expect(r.keyword).toBe('COMPUTER');
    expect(r.text).toBe('DO COMPUTERS WORRY YOU');
  });
});

describe('text handling', () => {
  it('maps punctuation the way 1966 ELIZA saw it', () => {
    expect(elizaUppercase('It’s true! Really? Yes: “no”')).toBe("IT'S TRUE. REALLY. YES,  NO ");
  });

  it('splits on delimiters', () => {
    expect(split('ONE   TWO, THREE.')).toEqual(['ONE', 'TWO', ',', 'THREE', '.']);
  });
});

describe('SLIP HASH and Hollerith encoding (values from the reference tests)', () => {
  it('encodes the last 6-character chunk of a word', () => {
    expect(lastChunkAsBcd('')).toBe(0o606060606060n);
    expect(lastChunkAsBcd('X')).toBe(0o676060606060n);
    expect(lastChunkAsBcd('HERE')).toBe(0o302551256060n);
    expect(lastChunkAsBcd('ALWAYS')).toBe(0o214366217062n);
    expect(lastChunkAsBcd('INVENTED')).toBe(0o252460606060n);
    expect(lastChunkAsBcd('123456ABCDEF')).toBe(0o212223242526n);
    expect(lastChunkAsBcd('Ç')).toBe(0o030760606060n);
  });

  it('hashes like SLIP', () => {
    expect(hash(0o214366217062n, 7)).toBe(14);
    expect(hash(0o302551256060n, 2)).toBe(3);
    expect(hash(0o423124626060n, 2)).toBe(1);
    expect(hash(0o633144256060n, 2)).toBe(0);
    expect(hash(0o777777777777n, 7)).toBe(0x70);
    expect(hash(0o777777777777n, 15)).toBe(0x7f00);
    expect(hash(0x555555555n, 15)).toBe(0x46e3);
    expect(hash(0xf0f0f0f0fn, 15)).toBe(0x7788);
    expect(hash(0o214366217062n, 15)).toBe(0x70ee);
    expect(hash(0o633144256060n, 15)).toBe(0x252e);
    expect(hash(0n, 7)).toBe(0);
    expect(hash(lastChunkAsBcd('PURPOSE'), 2)).toBe(1);
    expect(hash(lastChunkAsBcd('DEVONSHIRE'), 2)).toBe(0);
    expect(hash(lastChunkAsBcd('PREDICAMENT'), 2)).toBe(3);
    expect(hash(lastChunkAsBcd('EXECUTIONERS'), 2)).toBe(3);
    expect(hash(lastChunkAsBcd('GLOUCESTERSHIRE'), 2)).toBe(2);
  });
});

describe('pattern matching', () => {
  const tags = new Map<string, string[]>();
  it('matches 0, words and groups', () => {
    expect(match(tags, ['0', 'YOU', '(*WANT NEED)', '0'], ['YOU', 'NEED', 'NICE', 'FOOD'])).toEqual(['', 'YOU', 'NEED', 'NICE FOOD']);
    expect(match(tags, ['0', '0', 'YOU', '(*WANT NEED)', '0'], ['YOU', 'WANT', 'NICE', 'FOOD'])).toEqual(['', '', 'YOU', 'WANT', 'NICE FOOD']);
    expect(match(tags, ['1', '(*WANT NEED)', '0'], ['YOU', 'WANT', 'NICE', 'FOOD'])).toEqual(['YOU', 'WANT', 'NICE FOOD']);
    expect(match(tags, ['1', '(*WANT NEED)', '1'], ['YOU', 'WANT', 'NICE', 'FOOD'])).toBeNull();
  });

  it('only compares the first 6 letters in groups, like SLIP YMATCH', () => {
    expect(match(tags, ['(*DEPRESSED)'], ['DEPRESSING'])).toEqual(['DEPRESSING']);
  });
});
