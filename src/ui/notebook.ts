// The Lab Notebook: objectives, escalating hints, skips and collected placards.

import type { ObjectiveBase, Placard } from '../levels/types';
import type { ObjectiveState } from '../save';

export interface NotebookState {
  objectives: Record<string, ObjectiveState>;
  /** 0 cryptic, 1 clearer, 2 explicit. */
  hintLevel: number;
  canSkip: boolean;
  needed: number;
  placards: Placard[];
}

export class Notebook {
  readonly el: HTMLElement;
  readonly toggle: HTMLButtonElement;
  private readonly list: HTMLOListElement;
  private readonly museum: HTMLUListElement;
  private readonly count: HTMLSpanElement;
  onSkip: (id: string) => void = () => {};
  onPlacard: (p: Placard) => void = () => {};
  /** Once the player opens or closes it themselves, stop doing it for them. */
  userToggled = false;
  private readonly objectives: ObjectiveBase[];

  constructor(objectives: ObjectiveBase[], intro = 'Figure out how the doctor works.') {
    this.objectives = objectives;
    this.el = document.createElement('aside');
    this.el.className = 'notebook';
    this.el.id = 'notebook';
    this.el.setAttribute('aria-label', 'Lab notebook');
    this.el.innerHTML = `
      <header><h2>Lab Notebook</h2><span class="count"></span></header>
      <p class="nb-intro"></p>
      <ol class="objectives"></ol>
      <h3>Collected</h3>
      <ul class="museum"></ul>`;
    this.list = this.el.querySelector('.objectives')!;
    this.museum = this.el.querySelector('.museum')!;
    this.count = this.el.querySelector('.count')!;
    this.el.querySelector('.nb-intro')!.textContent = intro;

    this.toggle = document.createElement('button');
    this.toggle.type = 'button';
    this.toggle.className = 'hud-btn notebook-toggle';
    this.toggle.setAttribute('aria-controls', 'notebook');
    this.toggle.innerHTML = 'Notebook <kbd>N</kbd>';
    this.toggle.addEventListener('click', () => {
      this.userToggled = true;
      this.setOpen(!this.isOpen);
    });
    this.setOpen(false);
  }

  get isOpen(): boolean {
    return this.el.classList.contains('open');
  }

  setOpen(open: boolean): void {
    this.el.classList.toggle('open', open);
    this.toggle.setAttribute('aria-expanded', String(open));
  }

  flash(): void {
    this.toggle.classList.remove('flash');
    void this.toggle.offsetWidth;
    this.toggle.classList.add('flash');
  }

  render(s: NotebookState): void {
    const done = this.objectives.filter((o) => !o.hidden && s.objectives[o.id]).length;
    this.count.textContent = `${Math.min(done, s.needed)} of ${s.needed}`;
    this.list.textContent = '';
    for (const o of this.objectives) {
      const state = s.objectives[o.id];
      if (o.hidden && !state) continue;
      const li = document.createElement('li');
      li.className = state ?? 'open';
      const mark = state === 'done' ? '☑' : state === 'skipped' ? '☒' : '☐';
      li.innerHTML = `<span class="mark" aria-hidden="true">${mark}</span><div><p class="obj"></p><p class="hint"></p></div>`;
      li.querySelector('.obj')!.textContent = (o.hidden ? 'Bonus: ' : '') + o.title + (state === 'skipped' ? ' (skipped)' : '');
      const hint = li.querySelector('.hint')!;
      if (state) hint.remove();
      else hint.textContent = o.hints[Math.min(2, s.hintLevel)];
      if (!state && s.canSkip) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'skip';
        b.textContent = 'Skip';
        b.setAttribute('aria-label', `Skip: ${o.title}`);
        b.addEventListener('click', () => this.onSkip(o.id));
        li.querySelector('div')!.appendChild(b);
      }
      this.list.appendChild(li);
    }
    this.museum.textContent = '';
    for (const p of s.placards) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.title;
      b.addEventListener('click', () => this.onPlacard(p));
      li.appendChild(b);
      this.museum.appendChild(li);
    }
    if (s.placards.length === 0) this.museum.innerHTML = '<li class="empty">Nothing yet.</li>';
  }
}
