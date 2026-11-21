// The hint strip: always on screen at the bottom of a level. It shows one
// open objective with a clear hint, "Show me" for the explicit version, and
// "Try it" to fill in a worked example. "Another idea" cycles objectives.

import type { ObjectiveBase } from '../levels/types';
import type { ObjectiveState } from '../save';

export interface HintBarState {
  objectives: Record<string, ObjectiveState>;
  /** 1 clearer, 2 explicit (the cryptic tier lives only in the notebook). */
  level: number;
  canSkip: boolean;
}

export class HintBar {
  readonly el: HTMLDivElement;
  onTry: (o: ObjectiveBase) => void = () => {};
  onSkip: (id: string) => void = () => {};
  private readonly objectives: ObjectiveBase[];
  private readonly revealed = new Set<string>();
  private cursor = 0;
  private last: HintBarState | null = null;
  private collapsed = false;
  private key = '';

  constructor(objectives: ObjectiveBase[]) {
    this.objectives = objectives;
    this.el = document.createElement('div');
    this.el.className = 'hintbar';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Hint');
    try {
      this.collapsed = localStorage.getItem('mm-hints-collapsed') === '1';
    } catch {
      /* private mode */
    }
  }

  /** The objective currently shown, if any. */
  get current(): ObjectiveBase | null {
    const open = this.open();
    return open.length ? open[this.cursor % open.length] : null;
  }

  render(s: HintBarState = this.last!): void {
    if (!s) return;
    this.last = s;
    const o = this.current;
    this.el.hidden = !o;
    if (!o) {
      this.key = '';
      return;
    }
    const level = this.revealed.has(o.id) ? 2 : Math.max(1, Math.min(2, s.level));
    // Don't rebuild (and steal keyboard focus) when nothing visible changed.
    const key = [o.id, level, s.canSkip, this.open().length, this.collapsed].join('|');
    if (key === this.key) return;
    this.key = key;
    this.el.classList.toggle('collapsed', this.collapsed);
    if (this.collapsed) {
      this.el.innerHTML = '<button type="button" class="hb-open">💡 Hint</button>';
      this.el.querySelector('button')!.addEventListener('click', () => this.setCollapsed(false));
      return;
    }
    const canTry = !!(o.example || o.tryLabel);
    this.el.innerHTML = `
      <span class="hb-bulb" aria-hidden="true">💡</span>
      <p class="hb-text"><strong class="hb-goal"></strong> <span class="hb-hint"></span></p>
      <div class="hb-actions"></div>`;
    this.el.querySelector('.hb-goal')!.textContent = o.title;
    this.el.querySelector('.hb-hint')!.textContent = o.hints[level];
    const actions = this.el.querySelector('.hb-actions')!;
    const btn = (label: string, cls: string, fn: () => void, aria?: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hb-btn ${cls}`;
      b.textContent = label;
      if (aria) b.setAttribute('aria-label', aria);
      b.addEventListener('click', fn);
      actions.appendChild(b);
      return b;
    };
    if (level < 2) {
      btn('Show me', 'hb-primary', () => {
        this.revealed.add(o.id);
        this.render();
      });
    } else if (canTry) {
      btn(o.tryLabel ?? 'Try it', 'hb-primary', () => this.onTry(o));
    }
    if (this.open().length > 1) {
      btn('Another idea ↻', '', () => {
        this.cursor++;
        this.render();
      });
    }
    if (s.canSkip) btn('Skip', 'hb-skip', () => this.onSkip(o.id), `Skip: ${o.title}`);
    btn('×', 'hb-close', () => this.setCollapsed(true), 'Hide hints');
  }

  private setCollapsed(c: boolean): void {
    this.collapsed = c;
    try {
      localStorage.setItem('mm-hints-collapsed', c ? '1' : '0');
    } catch {
      /* private mode */
    }
    this.render();
    (this.el.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
  }

  private open(): ObjectiveBase[] {
    const st = this.last?.objectives ?? {};
    return this.objectives.filter((o) => !o.hidden && !st[o.id]);
  }
}
