// Text handling for ELIZA, ported to TypeScript from Anthony Hay's
// faithful JavaScript/C++ simulation of the 1966 program
// (github.com/anthay/ELIZA, CC0-1.0).

// ---- Hollerith (IBM 7094 BCD) character set --------------------------------

const HOLLERITH_UNDEFINED = 0xff;
const TABLE_SIZE = 256;

/** Maps character codes to their 6-bit Hollerith encoding. */
const hollerithEncoding: number[] = (() => {
  const bcd: (string | 0)[] = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 0, '=', "'", 0, 0, 0,
    '+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 0, '.', ')', 0, 0, 0,
    '-', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 0, '$', '*', 0, 0, 0,
    ' ', '/', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 0, ',', '(', 0, 0, 0,
  ];
  const table = new Array<number>(TABLE_SIZE).fill(HOLLERITH_UNDEFINED);
  bcd.forEach((c, i) => {
    if (c) table[c.charCodeAt(0)] = i;
  });
  return table;
})();

function hollerithDefined(u8: number): boolean {
  return u8 < TABLE_SIZE && hollerithEncoding[u8] !== HOLLERITH_UNDEFINED;
}

// ---- Input normalisation -----------------------------------------------------

/**
 * Uppercase the input and map punctuation the way ELIZA saw it:
 * ! and ? end a sentence (become '.'), colons, semicolons and dashes
 * become ',', and quotation marks become spaces.
 */
export function elizaUppercase(s: string): string {
  let result = '';
  for (const ch of s) {
    switch (ch.codePointAt(0)) {
      case 0x2019: // right single quote -> apostrophe (I’m -> I'M)
        result += "'";
        break;
      case 0x2018: case 0x0060: case 0x0022: case 0x00ab: case 0x00bb:
      case 0x201a: case 0x201b: case 0x201c: case 0x201d: case 0x201e:
      case 0x201f: case 0x2039: case 0x203a:
      case 0x00a1: case 0x00bf:
        result += ' ';
        break;
      case 0x0021: case 0x003f: // ! ?
        result += '.';
        break;
      case 0x003a: case 0x003b: case 0x2013: case 0x2014: // : ; – —
        result += ',';
        break;
      default:
        result += ch.toUpperCase();
    }
  }
  return result;
}

const isDelimiterChar = (c: string) => c === ',' || c === '.';

/** ELIZA treats ',', '.' and the word BUT as clause delimiters. */
export function isDelimiter(word: string): boolean {
  return word === 'BUT' || (word.length === 1 && isDelimiterChar(word));
}

/** Split into words; ',' and '.' become words of their own. */
export function split(s: string): string[] {
  const result: string[] = [];
  let word = '';
  for (const ch of s) {
    if (isDelimiterChar(ch) || ch === ' ') {
      if (word) {
        result.push(word);
        word = '';
      }
      if (ch !== ' ') result.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) result.push(word);
  return result;
}

/** Join words with single spaces, dropping empty ones. */
export function join(words: readonly string[]): string {
  return words.filter((w) => w.trim() !== '').join(' ');
}

/** Numeric value of an all-digit string, or -1. ("" -> 0, as in the original.) */
export function toInt(s: string): number {
  let result = 0;
  for (const c of s) {
    if (c < '0' || c > '9') return -1;
    result = 10 * result + (c.charCodeAt(0) - 48);
  }
  return result;
}

// ---- SLIP HASH, used to pick a MEMORY transformation --------------------------

/** Recreates the SLIP HASH function: an n-bit hash of a 36-bit datum. */
export function hash(datum: bigint, n: number): number {
  let d = datum & 0x7ffffffffn;
  d *= d;
  d >>= 35n - BigInt(Math.floor(n / 2));
  return Number(d & ((1n << BigInt(n)) - 1n));
}

/** 36-bit Hollerith encoding of the last 6-character chunk of a word, space padded. */
export function lastChunkAsBcd(str: string): bigint {
  let result = 0n;
  const append = (u8: number) => {
    result <<= 6n;
    result |= hollerithDefined(u8) ? BigInt(hollerithEncoding[u8]) : BigInt(u8) & 0x3fn;
  };
  let count = 0;
  if (str) {
    const bytes = Array.from(new TextEncoder().encode(str));
    for (const c of bytes.slice(Math.floor((bytes.length - 1) / 6) * 6)) {
      append(c);
      count++;
    }
  }
  while (count++ < 6) append(0x20);
  return result;
}
