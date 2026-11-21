// The 2019 "try the model" web page, framed by the boss HUD.

import { sfx } from '../../audio/sfx';
import type { ArchiveEntry } from '../../engine/models/archive';
import type { Generation } from '../../engine/models/client';
import { redact } from '../../engine/models/safety';
import { generator } from '../../game/generator';
import type { Example, Placard } from '../types';
import { showPlacard } from '../../ui/overlays';
import { BEATS, fillHint, type Beat, type Team } from './content';

export interface DemoRun {
  prompt: string;
  output: string;
  temperature: number;
  redacted: boolean;
  gen: Generation;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class Demo {
  readonly el: HTMLDivElement;
  onRun: (r: DemoRun) => void = () => {};
  onSkip: () => void = () => {};
  /** "Show me": reveal the explicit hint for this beat. */
  onReveal: () => void = () => {};
  private readonly prompt: HTMLTextAreaElement;
  private readonly card: HTMLSelectElement;
  private readonly temp: HTMLInputElement;
  private readonly tempOut: HTMLOutputElement;
  private readonly genBtn: HTMLButtonElement;
  private readonly stopBtn: HTMLButtonElement;
  private readonly out: HTMLDivElement;
  private readonly loading: HTMLDivElement;
  private readonly hp: HTMLDivElement;
  private readonly hpText: HTMLSpanElement;
  private readonly sparkle: HTMLDivElement;
  private readonly sparkleText: HTMLSpanElement;
  private readonly pips: HTMLOListElement;
  private readonly beatBox: HTMLDivElement;
  private readonly verdict: HTMLParagraphElement;
  private readonly archive: boolean;
  private ready = false;
  private stop: (() => void) | null = null;
  private cardsById = new Map<string, ArchiveEntry>();

  constructor(archive: boolean) {
    this.archive = archive;
    this.el = document.createElement('div');
    this.el.className = 'boss';
    this.el.innerHTML = `
      <div class="hud-boss">
        <div class="meter coherence"><span class="m-label">Coherence</span><div class="bar"><div class="fill"></div></div><span class="m-val"></span></div>
        <div class="meter sparkle"><span class="m-label">Sparkle</span><div class="bar"><div class="fill"></div></div><span class="m-val"></span></div>
        <ol class="pips" aria-label="Chapter progress">${BEATS.map((b) => `<li title="${esc(b.title)}"></li>`).join('')}</ol>
      </div>
      <div class="demo">
        <header class="demo-top"><span class="demo-logo">GPT-2</span><span class="demo-sub">124M · internal demo · <strong>do not share</strong></span></header>
        <div class="demo-body">
          <div class="beat-card"></div>
          <label class="demo-lbl" for="demo-prompt">Your text</label>
          <textarea id="demo-prompt" rows="4" spellcheck="false"></textarea>
          <select id="demo-card" aria-label="Prompt card"></select>
          <div class="demo-controls">
            <label>Temperature <input id="demo-temp" type="range" min="0.1" max="2" step="0.1" value="0.9" /> <output>0.9</output></label>
            <button type="button" class="demo-gen">Generate</button>
            <button type="button" class="demo-stop" disabled>Stop</button>
          </div>
          <p class="verdict" aria-live="polite"></p>
          <div class="demo-out" aria-live="off"></div>
          <p class="sr-only demo-said" aria-live="polite"></p>
          <div class="demo-loading" role="status"><p>Loading GPT-2…</p><progress max="1" value="0"></progress></div>
        </div>
      </div>`;
    this.prompt = this.el.querySelector('#demo-prompt')!;
    this.card = this.el.querySelector('#demo-card')!;
    this.temp = this.el.querySelector('#demo-temp')!;
    this.tempOut = this.temp.nextElementSibling as HTMLOutputElement;
    this.genBtn = this.el.querySelector('.demo-gen')!;
    this.stopBtn = this.el.querySelector('.demo-stop')!;
    this.out = this.el.querySelector('.demo-out')!;
    this.loading = this.el.querySelector('.demo-loading')!;
    this.hp = this.el.querySelector('.coherence .fill')!;
    this.hpText = this.el.querySelector('.coherence .m-val')!;
    this.sparkle = this.el.querySelector('.sparkle .fill')!;
    this.sparkleText = this.el.querySelector('.sparkle .m-val')!;
    this.pips = this.el.querySelector('.pips')!;
    this.beatBox = this.el.querySelector('.beat-card')!;
    this.verdict = this.el.querySelector('.verdict')!;

    this.prompt.hidden = archive;
    this.card.hidden = !archive;
    this.temp.addEventListener('input', () => (this.tempOut.value = Number(this.temp.value).toFixed(1)));
    this.prompt.addEventListener('input', () => (this.genBtn.textContent = 'Generate'));
    this.temp.addEventListener('input', () => (this.genBtn.textContent = 'Generate'));
    this.prompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void this.generate();
      } else if (e.key.length === 1) sfx.tap();
    });
    this.card.addEventListener('change', () => this.applyCard());
    this.genBtn.addEventListener('click', () => void this.generate());
    this.stopBtn.addEventListener('click', () => this.stop?.());
    this.setReady(false);
  }

  setProgress(loaded: number, total: number): void {
    const p = this.loading.querySelector('progress')!;
    p.max = total;
    p.value = loaded;
    this.loading.querySelector('p')!.textContent = `Loading GPT-2… ${Math.round(loaded / 1e6)} of ${Math.round(total / 1e6)} MB`;
  }

  setReady(ready: boolean, error?: string): void {
    this.ready = ready;
    this.loading.hidden = ready && !error;
    if (error) this.loading.querySelector('p')!.textContent = `Couldn’t load GPT-2: ${error}`;
    this.genBtn.disabled = !ready;
  }

  setCards(cards: ArchiveEntry[]): void {
    this.cardsById = new Map(cards.map((c) => [c.id, c]));
  }

  /** Show a beat: its card, starter text, temperature and (archive) prompt cards. */
  showBeat(beat: Beat, team: Team, hintLevel: number, canSkip: boolean, index: number): void {
    const level = Math.max(0, Math.min(2, hintLevel));
    this.beatBox.innerHTML = `
      <p class="beat-title">${esc(beat.title)}</p>
      <p class="beat-setup">${esc(beat.setup)} <strong>${esc(beat.goal)}</strong></p>
      <p class="beat-tech">${esc(beat.hints[0])}</p>
      ${level > 0 ? `<p class="beat-hint"><span aria-hidden="true">💡</span> ${esc(fillHint(beat.hints[level], team))}</p>` : ''}
      <div class="beat-actions">
        ${level < 2 ? '<button type="button" class="beat-reveal">Show me</button>' : '<button type="button" class="beat-try">Try it</button>'}
        ${canSkip ? '<button type="button" class="beat-skip">Skip this beat</button>' : ''}
      </div>`;
    this.beatBox.querySelector('.beat-skip')?.addEventListener('click', () => this.onSkip());
    this.beatBox.querySelector('.beat-reveal')?.addEventListener('click', () => this.onReveal());
    this.beatBox.querySelector('.beat-try')?.addEventListener('click', () => this.suggest(beat.example(team)));
    for (const [i, li] of [...this.pips.children].entries()) {
      li.className = i < index ? 'done' : i === index ? 'now' : '';
    }
    if (this.archive) {
      const labels = beat.cards(team).filter((c) => this.cardsById.has(c.id));
      this.card.innerHTML = labels.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
      this.applyCard();
    }
  }

  /** Reset the editor for a new beat. */
  startBeat(beat: Beat, team: Team): void {
    this.genBtn.textContent = 'Generate';
    this.prompt.value = fillHint(beat.starter(team), team);
    this.temp.value = String(beat.startTemp);
    this.tempOut.value = beat.startTemp.toFixed(1);
    this.out.innerHTML = '';
    this.verdict.textContent = '';
    this.verdict.className = 'verdict';
  }

  updateHud(coherence: number, sparkle: number, sparkleMax: number): void {
    this.hp.style.width = `${Math.max(0, coherence)}%`;
    this.hp.classList.toggle('low', coherence <= 30);
    this.hpText.textContent = `${Math.max(0, coherence)}`;
    this.sparkle.style.width = `${Math.min(100, (sparkle / sparkleMax) * 100)}%`;
    this.sparkleText.textContent = `${sparkle}`;
  }

  showVerdict(text: string, kind: 'pass' | 'fail' | 'attack'): void {
    this.verdict.textContent = text;
    this.verdict.className = `verdict ${kind}`;
    if (kind === 'attack') {
      this.el.classList.remove('shake');
      void this.el.offsetWidth;
      this.el.classList.add('shake');
    }
  }

  focus(): void {
    (this.archive ? this.card : this.prompt).focus({ preventScroll: true });
  }

  /** After a passed beat: keep GPT-2's text on screen until the player moves on. */
  afterPass(placard: Placard, nextLabel: string): Promise<void> {
    let read = false;
    const row = document.createElement('div');
    row.className = 'pass-actions';
    row.innerHTML = `<button type="button" class="pa-what">✦ What happened?</button><button type="button" class="pa-next"></button>`;
    row.querySelector('.pa-next')!.textContent = nextLabel;
    this.verdict.after(row);
    this.genBtn.disabled = true;
    row.querySelector('.pa-what')!.addEventListener('click', async () => {
      read = true;
      await showPlacard(placard, 'Close');
    });
    const next = row.querySelector<HTMLButtonElement>('.pa-next')!;
    next.focus({ preventScroll: true });
    return new Promise((resolve) => {
      next.addEventListener('click', async () => {
        if (!read) await showPlacard(placard);
        row.remove();
        this.genBtn.disabled = !this.ready;
        resolve();
      });
    });
  }

  /** Fill in a worked example, ready to generate. */
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
      this.prompt.focus({ preventScroll: true });
      this.prompt.setSelectionRange(this.prompt.value.length, this.prompt.value.length);
    }
    this.genBtn.classList.remove('nudge');
    void this.genBtn.offsetWidth;
    this.genBtn.classList.add('nudge');
  }

  private applyCard(): void {
    const c = this.cardsById.get(this.card.value);
    if (!c) return;
    this.temp.value = String(c.temperature);
    this.tempOut.value = c.temperature.toFixed(1);
    this.temp.disabled = true;
  }

  private async generate(): Promise<void> {
    if (!this.ready || this.stop) return;
    const card = this.archive ? this.cardsById.get(this.card.value) : undefined;
    // GPT-2 saw mostly straight quotes on the web; curly ones (from autocorrect) throw it off.
    if (!card) this.prompt.value = straightQuotes(this.prompt.value);
    const prompt = card ? card.prompt : this.prompt.value;
    if (!prompt.trim()) return;
    const temperature = Number(this.temp.value);
    this.out.innerHTML = '<span class="p"></span><span class="g"></span>';
    this.out.querySelector('.p')!.textContent = prompt;
    const g = this.out.querySelector<HTMLSpanElement>('.g')!;
    this.verdict.textContent = 'Generating…';
    this.verdict.className = 'verdict';
    this.genBtn.disabled = true;
    this.stopBtn.disabled = false;
    const run = generator.run(
      { model: 'gpt2', prompt, options: { temperature, maxNewTokens: 70, topK: 40 }, cardId: card?.id },
      (chunk) => {
        g.textContent += chunk;
        this.out.scrollTop = this.out.scrollHeight;
      },
    );
    this.stop = run.stop;
    let gen: Generation;
    try {
      gen = await run.result;
    } catch (e) {
      this.verdict.textContent = `Error: ${(e as Error).message}`;
      this.stop = null;
      this.genBtn.disabled = false;
      this.stopBtn.disabled = true;
      return;
    }
    this.stop = null;
    const { text, redacted } = redact(gen.text, 'sticker');
    g.textContent = text;
    this.el.querySelector('.demo-said')!.textContent = `GPT-2 continued: ${text}`;
    this.genBtn.disabled = false;
    this.stopBtn.disabled = true;
    this.genBtn.textContent = 'Generate again';
    this.onRun({ prompt, output: text, temperature, redacted, gen });
  }
}

/** Curly quotes to straight ones, as the 2019 web mostly had them. */
export function straightQuotes(text: string): string {
  return text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}
