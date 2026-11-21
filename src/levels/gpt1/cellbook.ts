// The 2018 research notebook on the monitor: write a prompt, set the
// temperature, run, watch GPT-1 continue the text token by token.

import { sfx } from '../../audio/sfx';
import { redact } from '../../engine/models/safety';
import type { Generation } from '../../engine/models/client';
import type { ArchiveEntry } from '../../engine/models/archive';
import { generator } from '../../game/generator';
import type { Example } from '../types';

export interface CellRun {
  prompt: string;
  output: string;
  temperature: number;
  maxTokens: number;
  redacted: boolean;
  gen: Generation;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class Cellbook {
  readonly el: HTMLDivElement;
  onRun: (r: CellRun) => void = () => {};
  private readonly cells: HTMLDivElement;
  private readonly prompt: HTMLTextAreaElement;
  private readonly card: HTMLSelectElement;
  private readonly temp: HTMLInputElement;
  private readonly tempOut: HTMLOutputElement;
  private readonly len: HTMLInputElement;
  private readonly lenOut: HTMLOutputElement;
  private readonly runBtn: HTMLButtonElement;
  private readonly stopBtn: HTMLButtonElement;
  private readonly ctx: HTMLSpanElement;
  private readonly loading: HTMLDivElement;
  private n = 0;
  private stop: (() => void) | null = null;
  private ready = false;
  private cardsById = new Map<string, ArchiveEntry>();
  private readonly archive: boolean;

  constructor(archive: boolean) {
    this.archive = archive;
    this.el = document.createElement('div');
    this.el.className = 'cellbook';
    this.el.innerHTML = `
      <div class="nb-bar"><span class="nb-logo">◉ notebook</span><span class="nb-file">gpt_117M_sampling.ipynb</span><span class="nb-kernel">Python 3 <i class="dot"></i></span></div>
      <div class="nb-scroll">
        <div class="nb-md"><h3>GPT-1 (117M) · sampling</h3><p>The pretrained model, before any fine-tuning: it has only learned to continue text. Write the start of some text and it writes what comes next. Context window: 512 tokens. <em>Tip: run the same prompt twice, or at two temperatures, and compare.</em>${archive ? ' <strong>Archive Mode:</strong> pick a prompt card; outputs are real recordings from this model.' : ''}</p></div>
        <div class="cells"></div>
        <div class="cell active">
          <div class="in">In [ ]:</div>
          <div class="editor">
            <label class="lbl" for="nb-prompt">prompt =</label>
            <textarea id="nb-prompt" rows="3" spellcheck="false" placeholder="Hello, how are you?"></textarea>
            <select id="nb-card" aria-label="Prompt card"></select>
            <div class="knobs">
              <label>temperature = <input id="nb-temp" type="range" min="0.1" max="2" step="0.1" value="0.8" /> <output>0.8</output></label>
              <label>max_tokens = <input id="nb-len" type="range" min="20" max="120" step="10" value="80" /> <output>80</output></label>
            </div>
            <div class="run-row">
              <button type="button" class="nb-run">▶ Run <kbd>Shift+Enter</kbd></button>
              <button type="button" class="nb-stop" disabled>■ Stop</button>
              <span class="ctx"></span>
            </div>
          </div>
        </div>
        <div class="nb-loading" role="status"><p>Loading model weights…</p><progress max="1" value="0"></progress></div>
      </div>
      <p class="sr-only nb-said" aria-live="polite"></p>`;
    this.cells = this.el.querySelector('.cells')!;
    this.prompt = this.el.querySelector('#nb-prompt')!;
    this.card = this.el.querySelector('#nb-card')!;
    this.temp = this.el.querySelector('#nb-temp')!;
    this.tempOut = this.temp.nextElementSibling as HTMLOutputElement;
    this.len = this.el.querySelector('#nb-len')!;
    this.lenOut = this.len.nextElementSibling as HTMLOutputElement;
    this.runBtn = this.el.querySelector('.nb-run')!;
    this.stopBtn = this.el.querySelector('.nb-stop')!;
    this.ctx = this.el.querySelector('.ctx')!;
    this.loading = this.el.querySelector('.nb-loading')!;

    this.prompt.hidden = archive;
    this.card.hidden = !archive;
    this.temp.addEventListener('input', () => {
      this.tempOut.value = Number(this.temp.value).toFixed(1);
      this.syncRunLabel();
    });
    this.len.addEventListener('input', () => (this.lenOut.value = this.len.value));
    this.prompt.addEventListener('input', () => {
      this.updateContext();
      this.syncRunLabel();
    });
    this.prompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        void this.run();
      } else if (e.key.length === 1) sfx.tap();
    });
    this.card.addEventListener('change', () => {
      this.applyCard();
      this.syncRunLabel();
    });
    this.runBtn.addEventListener('click', () => void this.run());
    this.stopBtn.addEventListener('click', () => this.stop?.());
    this.setReady(false);
    this.updateContext();
  }

  setProgress(loaded: number, total: number): void {
    const p = this.loading.querySelector('progress')!;
    p.max = total;
    p.value = loaded;
    this.loading.querySelector('p')!.textContent = `Loading model weights… ${Math.round(loaded / 1e6)} of ${Math.round(total / 1e6)} MB`;
  }

  setReady(ready: boolean, error?: string): void {
    this.ready = ready;
    this.loading.hidden = ready && !error;
    if (error) this.loading.querySelector('p')!.textContent = `Couldn’t load the model: ${error}`;
    this.runBtn.disabled = !ready;
  }

  setCards(cards: ArchiveEntry[], labels: { id: string; label: string }[]): void {
    this.cardsById = new Map(cards.map((c) => [c.id, c]));
    this.card.innerHTML = labels
      .filter((l) => this.cardsById.has(l.id))
      .map((l) => `<option value="${l.id}">${esc(l.label)}</option>`)
      .join('');
    this.applyCard();
  }

  focus(): void {
    (this.archive ? this.card : this.prompt).focus({ preventScroll: true });
  }

  /** Fill in a worked example (the hint strip's "Try it"), ready to run. */
  suggest(ex: Example): void {
    if (this.archive) {
      if (ex.card && this.cardsById.has(ex.card)) {
        this.card.value = ex.card;
        this.applyCard();
      }
      this.card.focus({ preventScroll: true });
    } else {
      this.prompt.value = ex.steps[0];
      if (ex.temperature !== undefined) {
        this.temp.value = String(ex.temperature);
        this.tempOut.value = ex.temperature.toFixed(1);
      }
      this.updateContext();
      this.prompt.focus({ preventScroll: true });
      this.prompt.setSelectionRange(this.prompt.value.length, this.prompt.value.length);
    }
    this.runBtn.classList.remove('nudge');
    void this.runBtn.offsetWidth;
    this.runBtn.classList.add('nudge');
  }

  private applyCard(): void {
    const c = this.cardsById.get(this.card.value);
    if (!c) return;
    this.temp.value = String(c.temperature);
    this.tempOut.value = c.temperature.toFixed(1);
    this.len.value = String(c.maxNewTokens);
    this.lenOut.value = String(c.maxNewTokens);
    this.updateContext();
  }

  private updateContext(): void {
    const text = this.archive ? (this.cardsById.get(this.card.value)?.prompt ?? '') : this.prompt.value;
    // GPT-1 tokens are roughly words and punctuation marks.
    const est = (text.toLowerCase().match(/[a-z0-9']+|[^\sa-z0-9']/g) ?? []).length;
    this.ctx.textContent = `context: ~${est} + ${this.len.value} / 512 tokens`;
    this.temp.disabled = this.len.disabled = this.archive;
  }

  private async run(): Promise<void> {
    if (!this.ready || this.stop) return;
    const card = this.archive ? this.cardsById.get(this.card.value) : undefined;
    const prompt = card ? card.prompt : this.prompt.value.trim();
    if (!prompt) {
      this.prompt.focus();
      return;
    }
    const temperature = Number(this.temp.value);
    const maxTokens = Number(this.len.value);
    this.n++;
    const cell = document.createElement('div');
    cell.className = 'cell done';
    cell.innerHTML = `
      <div class="in">In [${this.n}]:</div><pre class="code">generate(prompt=${esc(JSON.stringify(prompt))}, temperature=${temperature.toFixed(1)}, max_tokens=${maxTokens})</pre>
      <div class="in out-label">Out[${this.n}]:</div><pre class="out"><span class="p"></span><span class="g"></span></pre>`;
    cell.querySelector('.p')!.textContent = prompt;
    const g = cell.querySelector<HTMLSpanElement>('.g')!;
    this.cells.appendChild(cell);
    this.scrollToEnd();

    this.runBtn.disabled = true;
    this.stopBtn.disabled = false;
    const run = generator.run(
      { model: 'gpt1', prompt, options: { temperature, maxNewTokens: maxTokens, topK: 0 }, cardId: card?.id },
      (chunk) => {
        g.textContent += chunk;
        this.scrollToEnd();
      },
    );
    this.stop = run.stop;
    let gen: Generation;
    try {
      gen = await run.result;
    } catch (e) {
      g.textContent = `\n[error: ${(e as Error).message}]`;
      this.stop = null;
      this.runBtn.disabled = false;
      this.stopBtn.disabled = true;
      return;
    }
    this.stop = null;
    const { text, redacted } = redact(gen.text, 'plain');
    g.textContent = text;
    if (redacted) cell.classList.add('redacted');
    this.el.querySelector('.nb-said')!.textContent = `GPT-1 continued: ${text}`;
    this.runBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.scrollToEnd();
    this.lastRun = `${prompt}|${temperature}`;
    this.syncRunLabel();
    this.onRun({ prompt, output: text, temperature, maxTokens, redacted, gen });
  }

  private lastRun = '';

  /** "Run again" when nothing changed since the last run: same prompt, new dice. */
  private syncRunLabel(): void {
    const current = `${this.archive ? (this.cardsById.get(this.card.value)?.prompt ?? '') : this.prompt.value.trim()}|${Number(this.temp.value)}`;
    this.runBtn.innerHTML = current === this.lastRun ? '↻ Run again <kbd>Shift+Enter</kbd>' : '▶ Run <kbd>Shift+Enter</kbd>';
  }

  private scrollToEnd(): void {
    const s = this.el.querySelector('.nb-scroll')!;
    s.scrollTop = s.scrollHeight;
  }
}
