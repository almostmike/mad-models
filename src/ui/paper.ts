// The IBM 2741 printout: everything (yours and the machine's) is struck
// onto one continuous sheet by the same typeball. The keyboard locks
// while the machine prints, as on the real half-duplex terminal.

import { sfx } from '../audio/sfx';
import { CHARS_PER_SECOND, NEWLINE_PAUSE_MS } from '../printer';

export class PaperTerminal {
  readonly el: HTMLDivElement;
  private readonly sheet: HTMLDivElement;
  private readonly lines: HTMLDivElement;
  private readonly entry: HTMLInputElement;
  private readonly spoken: HTMLParagraphElement;
  private currentLine!: HTMLDivElement;
  private printed = 0; // characters struck, for ribbon wear
  private printing = false;
  private queue: Promise<void> = Promise.resolve();
  private skipping = false;
  /** Keep the keyboard locked even when nothing is printing (cut-scenes). */
  private held = true;
  /** Print instantly (reduced motion). */
  instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  onSubmit: (text: string) => void = () => {};

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'terminal';
    this.el.innerHTML = `
      <div class="sheet">
        <div class="lines" aria-hidden="true"></div>
        <form class="entry-line" autocomplete="off">
          <label class="sr-only" for="entry">Type to the terminal, then press Enter</label>
          <input id="entry" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" maxlength="160" readonly />
        </form>
      </div>
      <p class="sr-only" aria-live="polite"></p>`;
    this.sheet = this.el.querySelector('.sheet')!;
    this.lines = this.el.querySelector('.lines')!;
    this.entry = this.el.querySelector('input')!;
    this.spoken = this.el.querySelector('p')!;
    this.newLine();

    this.el.querySelector('form')!.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.entry.value.trim();
      if (this.locked || !text) return;
      this.entry.value = '';
      this.strikeText(text);
      sfx.carriageReturn();
      this.newLine();
      this.onSubmit(text);
    });
    this.entry.addEventListener('keydown', (e) => {
      if (this.locked) {
        if (e.key !== 'Tab' && e.key !== 'Escape') e.preventDefault();
        return;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        if (e.key === ' ') sfx.space();
        else sfx.key();
      }
    });
    this.sheet.addEventListener('click', () => this.focus());

    // Stay pinned to the newest line when the window resizes, unless the
    // player has scrolled up to reread.
    this.sheet.addEventListener('scroll', () => {
      const s = this.sheet;
      this.pinned = s.scrollHeight - s.scrollTop - s.clientHeight < 40;
    });
    new ResizeObserver(() => {
      if (this.pinned) this.scrollToEnd();
    }).observe(this.sheet);
  }

  private pinned = true;

  get locked(): boolean {
    return this.printing || this.held;
  }

  /** Lock or unlock the keyboard (outside of printing). */
  hold(held: boolean): void {
    this.held = held;
    this.sync();
  }

  focus(): void {
    this.entry.focus({ preventScroll: true });
  }

  /** Print text at 2741 speed. Calls are queued; resolves when this text is done. */
  print(text: string, announce = true): Promise<void> {
    this.queue = this.queue.then(() => this.printNow(text, announce));
    return this.queue;
  }

  /** Finish whatever is printing immediately. */
  skip(): void {
    if (this.printing) this.skipping = true;
  }

  /** The printout is torn off: start a clean sheet. */
  clear(): void {
    this.lines.textContent = '';
    this.newLine();
  }

  private sync(): void {
    this.entry.readOnly = this.locked;
    this.el.classList.toggle('printing', this.printing);
    this.el.classList.toggle('held', this.held);
  }

  private async printNow(text: string, announce: boolean): Promise<void> {
    this.printing = true;
    this.sync();
    if (announce) this.spoken.textContent = text.replace(/\n+/g, ' ').trim();
    const perChar = 1000 / CHARS_PER_SECOND;
    let due = performance.now();
    for (const ch of text) {
      if (this.skipping || this.instant) {
        this.put(ch, false);
        continue;
      }
      due += ch === '\n' ? NEWLINE_PAUSE_MS : perChar;
      await waitUntil(due);
      this.put(ch, true);
    }
    this.skipping = false;
    this.printing = false;
    this.sync();
    this.scrollToEnd();
  }

  private put(ch: string, withSound: boolean): void {
    if (ch === '\n') {
      if (withSound) sfx.carriageReturn();
      this.newLine();
    } else {
      if (withSound) {
        if (ch === ' ') sfx.space();
        else sfx.strike();
      }
      this.strikeChar(ch);
    }
    this.scrollToEnd();
  }

  private strikeText(text: string): void {
    for (const ch of text) this.strikeChar(ch);
  }

  /** Strike one character, with the small irregularities of a real typeball. */
  private strikeChar(ch: string): void {
    const span = document.createElement('span');
    span.textContent = ch;
    if (ch !== ' ') {
      this.printed++;
      const wear = Math.min(0.22, this.printed / 40000); // the ribbon slowly fades
      span.style.setProperty('--a', (0.8 + Math.random() * 0.2 - wear).toFixed(2));
      span.style.setProperty('--dx', `${((Math.random() - 0.5) * 0.6).toFixed(2)}px`);
      span.style.setProperty('--dy', `${((Math.random() - 0.5) * 0.8).toFixed(2)}px`);
      span.style.setProperty('--rot', `${((Math.random() - 0.5) * 1.6).toFixed(2)}deg`);
    }
    this.currentLine.appendChild(span);
  }

  private newLine(): void {
    this.currentLine = document.createElement('div');
    this.currentLine.className = 'pline';
    this.lines.appendChild(this.currentLine);
    this.scrollToEnd();
  }

  private scrollToEnd(): void {
    this.sheet.scrollTop = this.sheet.scrollHeight;
  }
}

function waitUntil(t: number): Promise<void> {
  const ms = t - performance.now();
  return new Promise((resolve) => {
    if (ms <= 0) queueMicrotask(resolve);
    else setTimeout(resolve, ms);
  });
}
