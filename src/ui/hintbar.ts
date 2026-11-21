// The hint strip: always on screen at the bottom of a level. It shows one
// open objective with a hint that sharpens as you miss ("Show me" skips
// ahead, "Try it" fills in a worked example), how many you still need, and
// "What happened?" for discoveries you haven't read yet. Placards wait for
// the player, so they never cover the output being looked at.

import type { ObjectiveBase, Placard } from '../levels/types';
import type { ObjectiveState } from '../save';
import { showPlacard } from './overlays';

export interface HintBarState {
  objectives: Record<string, ObjectiveState>;
  /** 0 teaser, 1 clearer, 2 explicit. */
  level: number;
  canSkip: boolean;
  /** Objectives needed to move on. */
  needed: number;
}

export class HintBar {
  readonly el: HTMLDivElement;
  onTry: (o: ObjectiveBase) => void = () => {};
  onSkip: (id: string) => void = () => {};
  private readonly objectives: ObjectiveBase[];
  private readonly revealed = new Set<string>();
  private readonly unread: Placard[] = [];
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

  /** Queue a discovery's placard behind "What happened?". */
  discover(p: Placard): void {
    if (!this.unread.some((u) => u.id === p.id)) this.unread.push(p);
    this.render();
  }

  /** Show every unread placard (before the story moves on). */
  async flush(): Promise<void> {
    while (this.unread.length) await this.readNext();
  }

  private async readNext(): Promise<void> {
    const p = this.unread.shift();
    this.render();
    if (p) await showPlacard(p);
  }

  render(s: HintBarState = this.last!): void {
    if (!s) return;
    this.last = s;
    const o = this.current;
    const news = this.unread.length;
    this.el.hidden = !o && !news;
    if (this.el.hidden) {
      this.key = '';
      return;
    }
    const level = o ? (this.revealed.has(o.id) ? 2 : Math.max(0, Math.min(2, s.level))) : 0;
    const found = this.objectives.filter((x) => !x.hidden && s.objectives[x.id]).length;
    const total = this.objectives.filter((x) => !x.hidden).length;
    // Don't rebuild (and steal keyboard focus) when nothing visible changed.
    const key = [o?.id, level, s.canSkip, this.open().length, this.collapsed, news, found].join('|');
    if (key === this.key) return;
    this.key = key;
    this.el.classList.toggle('collapsed', this.collapsed && !news);
    if (this.collapsed && !news) {
      this.el.innerHTML = '<button type="button" class="hb-open">💡 Hint</button>';
      this.el.querySelector('button')!.addEventListener('click', () => this.setCollapsed(false));
      return;
    }
    this.el.innerHTML = `
      <span class="hb-bulb" aria-hidden="true">💡</span>
      <p class="hb-text"><span class="hb-progress"></span> <strong class="hb-goal"></strong> <span class="hb-hint"></span></p>
      <div class="hb-actions"></div>`;
    this.el.querySelector('.hb-progress')!.textContent =
      found >= s.needed ? `${found} of ${total} found, enough to move on.` : `${found} of ${s.needed} needed (any ${s.needed} of ${total}).`;
    this.el.querySelector('.hb-goal')!.textContent = o ? o.title : '';
    this.el.querySelector('.hb-hint')!.textContent = o ? o.hints[level] : '';
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
    if (news) {
      const label = news > 1 ? `✦ What happened? (${news})` : '✦ What happened?';
      btn(label, 'hb-news', () => void this.readNext(), `What happened? Read ${news} new discover${news > 1 ? 'ies' : 'y'}`);
    }
    if (o) {
      if (level < 2) {
        btn('Show me', news ? '' : 'hb-primary', () => {
          this.revealed.add(o.id);
          this.render();
        });
      } else if (o.example || o.tryLabel) {
        btn(o.tryLabel ?? 'Try it', news ? '' : 'hb-primary', () => this.onTry(o));
      }
      if (this.open().length > 1) {
        btn('Another idea ↻', '', () => {
          this.cursor++;
          this.render();
        });
      }
      if (s.canSkip) btn('Skip', 'hb-skip', () => this.onSkip(o.id), `Skip: ${o.title}`);
    }
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
