// Reader for ELIZA scripts in the 1966 CACM format, ported to TypeScript
// from Anthony Hay's simulation (github.com/anthay/ELIZA, CC0-1.0).
//
// eliza_script    : opening_remarks ['START'] rules ['(' ')']
// opening_remarks : '(' {word | punctuation} ')'
// rules           : keyword_rule {keyword_rule} memory_rule none_rule
// keyword_rule    : '(' keyword ['=' substitute] ['DLIST' '(' '/' tags ')'] [precedence]
//                       {'(' decomposition reassembly {reassembly} ')'} ['(' '=' link ')'] ')'
// memory_rule     : '(' 'MEMORY' keyword 4 x ('(' decomposition '=' reassembly ')') ')'

import { KeywordRule, MemoryRule, SPECIAL_RULE_NONE, reassemblyIndexesValid } from './rules';
import { elizaUppercase } from './text';

export interface Script {
  /** Opening remark, e.g. HOW DO YOU DO. PLEASE TELL ME YOUR PROBLEM */
  hello: string[];
  rules: Map<string, KeywordRule>;
  memory: MemoryRule;
}

type TokenType = 'eof' | 'open' | 'close' | 'symbol' | 'number';
interface Token {
  t: TokenType;
  value: string;
}

class Tokenizer {
  private pos = 0;
  private peeked: Token | null = null;
  line = 1;
  private readonly text: string;

  constructor(text: string) {
    this.text = text;
  }

  peek(): Token {
    this.peeked ??= this.read();
    return this.peeked;
  }

  next(): Token {
    const t = this.peek();
    this.peeked = null;
    return t;
  }

  private eof() {
    return this.pos >= this.text.length;
  }

  private isWhitespace(ch: string) {
    return ch <= ' ' || ch === '\x7f';
  }

  private isNewline(ch: string) {
    return ch === '\n' || ch === '\x0b' || ch === '\x0c' || ch === '\r';
  }

  private consumeNewline(ch: string) {
    if (ch === '\r' && !this.eof() && this.text[this.pos] === '\n') this.pos++;
    this.line++;
  }

  private read(): Token {
    let ch = '';
    for (;;) {
      do {
        if (this.eof()) return { t: 'eof', value: '' };
        ch = this.text[this.pos++];
        if (this.isNewline(ch)) this.consumeNewline(ch);
      } while (this.isWhitespace(ch));
      if (ch !== ';') break;
      do {
        if (this.eof()) return { t: 'eof', value: '' };
        ch = this.text[this.pos++];
      } while (!this.isNewline(ch));
      this.consumeNewline(ch);
    }

    if (ch === '(') return { t: 'open', value: '' };
    if (ch === ')') return { t: 'close', value: '' };
    if (ch === '=') return { t: 'symbol', value: '=' };

    const isDigit = (c: string) => c >= '0' && c <= '9';
    if (isDigit(ch)) {
      let value = ch;
      while (!this.eof() && isDigit(this.text[this.pos])) value += this.text[this.pos++];
      return { t: 'number', value };
    }

    let value = ch;
    while (!this.eof()) {
      const c = this.text[this.pos];
      if (c === '(' || c === ')' || c === ';' || c === '=' || this.isWhitespace(c)) break;
      value += c;
      this.pos++;
    }
    return { t: 'symbol', value: elizaUppercase(value) };
  }
}

const isSymbol = (t: Token, v?: string) => t.t === 'symbol' && (v === undefined || t.value === v);

class ScriptReader {
  private readonly tok: Tokenizer;
  private readonly references: [number, string][] = [];
  readonly script: Script = { hello: [], rules: new Map(), memory: new MemoryRule() };

  constructor(text: string) {
    this.tok = new Tokenizer(text);
    this.script.hello = this.readList();
    if (isSymbol(this.tok.peek(), 'START')) this.tok.next();
    while (this.readRule());

    const { rules, memory } = this.script;
    if (!rules.has(SPECIAL_RULE_NONE)) throw new Error('Script error: no NONE rule specified');
    if (!memory.keyword) throw new Error('Script error: no MEMORY rule specified');
    if (!rules.has(memory.keyword)) {
      throw new Error(`Script error: MEMORY keyword '${memory.keyword}' is not also a keyword in its own right`);
    }
    for (const [line, ref] of this.references) {
      if (!rules.has(ref)) throw new Error(`Script error on line ${line}: '=${ref}' referenced keyword does not exist`);
      if (!rules.get(ref)!.hasTransformation()) {
        throw new Error(`Script error on line ${line}: '=${ref}' referenced keyword has no transformation rules`);
      }
    }
  }

  private error(msg: string): Error {
    return new Error(`Script error on line ${this.tok.line}: ${msg}`);
  }

  private readRule(): boolean {
    let t = this.tok.next();
    if (t.t === 'eof') return false;
    if (t.t !== 'open') throw this.error("expected '('");
    t = this.tok.peek();
    if (t.t === 'close') {
      this.tok.next();
      return true;
    }
    if (!isSymbol(t)) throw this.error('expected keyword|MEMORY|NONE');
    return t.value === 'MEMORY' ? this.readMemoryRule() : this.readKeywordRule();
  }

  private readKeywordRule(): boolean {
    let t = this.tok.next();
    const name = t.value;
    const keyword = name === 'NONE' ? SPECIAL_RULE_NONE : name;
    if (this.script.rules.has(keyword)) throw this.error(`keyword rule already specified for '${name}'`);
    if (this.tok.peek().t === 'close') throw this.error(`keyword '${name}' has no associated body`);

    let substitution = '';
    let precedence = 0;
    let tags: string[] = [];
    let link = '';
    const transforms: { decomposition: string[]; reassembly: string[][] }[] = [];

    for (t = this.tok.next(); t.t !== 'close'; t = this.tok.next()) {
      if (isSymbol(t, '=')) {
        t = this.tok.next();
        if (!isSymbol(t)) throw this.error('expected keyword');
        substitution = t.value;
      } else if (t.t === 'number') {
        precedence = parseInt(t.value, 10);
      } else if (isSymbol(t, 'DLIST')) {
        if (this.tok.next().t !== 'open') throw this.error("expected '('");
        t = this.tok.next();
        if (!isSymbol(t) || !t.value.startsWith('/')) throw this.error("expected '/'");
        tags = this.readList(false);
        if (t.value.length > 1) tags.unshift(t.value.substring(1));
      } else if (t.t === 'open') {
        if (isSymbol(this.tok.peek(), '=')) {
          this.tok.next();
          t = this.tok.next();
          if (!isSymbol(t)) throw this.error('expected equivalence class name');
          link = t.value;
          this.references.push([this.tok.line, t.value]);
          if (this.tok.next().t !== 'close') throw this.error("expected ')'");
          if (this.tok.peek().t !== 'close') throw this.error("expected ')'");
        } else {
          const decomposition = this.readList();
          if (decomposition.length === 0) throw this.error('decompose pattern cannot be empty');
          const reassembly: string[][] = [];
          while (this.tok.peek().t === 'open') {
            const r = this.readReassembly();
            const problem = reassemblyIndexesValid(decomposition, r);
            if (problem) throw this.error(problem);
            reassembly.push(r);
          }
          if (this.tok.next().t !== 'close') throw this.error("expected ')'");
          transforms.push({ decomposition, reassembly });
        }
      } else {
        throw this.error('malformed rule');
      }
    }

    const rule = new KeywordRule(keyword, substitution, precedence, tags, link);
    for (const tr of transforms) rule.addTransform(tr.decomposition, tr.reassembly);
    this.script.rules.set(keyword, rule);
    return true;
  }

  private readReassembly(): string[] {
    if (this.tok.next().t !== 'open') throw this.error("expected '('");

    if (!isSymbol(this.tok.peek(), 'PRE')) {
      const r = this.readList(false);
      if (r.length !== 0 && r[0] === '=') {
        if (r.length !== 2) throw this.error("expected reference keyword to follow '='");
        this.references.push([this.tok.line, r[1]]);
      }
      return r;
    }

    // (PRE (I ARE 3) (=YOU)), stored flat
    this.tok.next();
    const reconstruct = this.readList();
    const reference = this.readList();
    if (reference.length !== 2 || reference[0] !== '=') throw this.error("expected '(=reference)' in PRE rule");
    this.references.push([this.tok.line, reference[1]]);
    if (this.tok.next().t !== 'close') throw this.error("expected ')'");
    return ['(', 'PRE', '(', ...reconstruct, ')', '(', ...reference, ')', ')'];
  }

  private readMemoryRule(): boolean {
    this.tok.next(); // MEMORY
    const t = this.tok.next();
    if (!isSymbol(t)) throw this.error('expected keyword to follow MEMORY');
    if (this.script.memory.keyword) throw this.error('multiple MEMORY rules specified');
    this.script.memory.keyword = t.value;

    for (let i = 0; i < 4; i++) {
      if (this.tok.next().t !== 'open') throw this.error("expected '(' in MEMORY rule");
      const decomposition: string[] = [];
      let u = this.tok.next();
      for (; !isSymbol(u, '=') && u.t !== 'eof'; u = this.tok.next()) decomposition.push(u.value);
      if (decomposition.length === 0 || !isSymbol(u, '=')) throw this.error("expected 'decompose = reassemble'");
      const reassembly: string[] = [];
      for (u = this.tok.next(); u.t !== 'close' && u.t !== 'eof'; u = this.tok.next()) reassembly.push(u.value);
      if (reassembly.length === 0 || u.t !== 'close') throw this.error("expected 'decompose = reassemble)'");
      const problem = reassemblyIndexesValid(decomposition, reassembly);
      if (problem) throw this.error(problem);
      this.script.memory.addTransform(decomposition, [reassembly]);
    }

    if (this.tok.next().t !== 'close') throw this.error("expected ')' to end MEMORY rule");
    return true;
  }

  /** Read "( a b (c d) )" -> ["a", "b", "(c d)"]. */
  private readList(expectOpen = true): string[] {
    const s: string[] = [];
    let t = this.tok.next();
    if (expectOpen) {
      if (t.t !== 'open') throw this.error("expected '('");
      t = this.tok.next();
    }
    while (t.t !== 'close') {
      if (t.t === 'symbol' || t.t === 'number') {
        s.push(t.value);
      } else if (t.t === 'open') {
        const sub: string[] = [];
        for (t = this.tok.next(); t.t !== 'close'; t = this.tok.next()) {
          if (!isSymbol(t)) throw this.error('expected symbol');
          sub.push(t.value);
        }
        s.push(`(${sub.join(' ')})`);
      } else {
        throw this.error("expected ')'");
      }
      t = this.tok.next();
    }
    return s;
  }
}

/** Parse an ELIZA script. Throws an Error describing the first problem. */
export function readScript(text: string): Script {
  return new ScriptReader(text).script;
}
