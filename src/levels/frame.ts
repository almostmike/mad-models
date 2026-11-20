// Shared scaffolding for the GPT levels: a first-person room with clickable
// props, a "focused" screen you sit down at, the Lab Notebook, escalating
// hints, skips, placards and saving.

import type { LevelState, SaveData } from '../save';
import { Notebook } from '../ui/notebook';
import { caption, narrate, showPlacard } from '../ui/overlays';
import type { ObjectiveBase, Placard } from './types';

export interface PropDef {
  id: string;
  label: string;
  layer: 'wall' | 'desk';
}

export interface FrameOptions {
  className: string;
  where: string;
  /** HTML for the wall and desk layers (grey-box art). */
  wall: string;
  desk: string;
  props: PropDef[];
  objectives: ObjectiveBase[];
  needed: number;
  intro: string;
  state: LevelState;
  data: SaveData;
  persist: () => void;
  sitLabel: string;
}

const TURNS_PER_HINT = 3;
const SKIP_AFTER_TURNS = 8;
const SKIP_AFTER_MS = 3 * 60 * 1000;

export class LevelFrame {
  readonly el: HTMLDivElement;
  readonly scene: HTMLDivElement;
  readonly stage: HTMLDivElement;
  readonly actions: HTMLDivElement;
  readonly notebook: Notebook;
  focused = false;
  ending = false;
  onFocus: (focused: boolean) => void = () => {};
  onProp: (id: string) => void = () => {};
  onSkipped: () => void = () => {};
  private turnsSinceProgress = 0;
  private lastProgress = performance.now();
  private readonly timer: number;
  private readonly sitBtn: HTMLButtonElement;
  private readonly opts: FrameOptions;
  private readonly onKey = (e: KeyboardEvent) => this.key(e);

  constructor(opts: FrameOptions) {
    this.opts = opts;
    this.el = document.createElement('div');
    this.el.className = `level ${opts.className}`;

    this.scene = document.createElement('div');
    this.scene.className = 'scene room';
    this.scene.innerHTML = `<div class="layer wall">${opts.wall}</div><div class="layer desk">${opts.desk}</div><div class="vignette"></div>`;
    for (const p of opts.props) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `prop prop-${p.id}`;
      b.setAttribute('aria-label', p.label);
      b.title = p.label;
      b.innerHTML = '<span class="prop-art"></span>';
      b.addEventListener('click', () => this.onProp(p.id));
      this.scene.querySelector(`.layer.${p.layer}`)!.appendChild(b);
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.scene.addEventListener('pointermove', (e) => {
        const r = this.scene.getBoundingClientRect();
        this.scene.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        this.scene.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    }

    this.stage = document.createElement('div');
    this.stage.className = 'stage';

    this.notebook = new Notebook(opts.objectives, opts.intro);
    this.notebook.onSkip = (id) => void this.skip(id);
    this.notebook.onPlacard = (p) => void showPlacard(p, 'Close');

    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `<p class="where"></p><div class="hud-actions"></div>`;
    hud.querySelector('.where')!.textContent = opts.where;
    this.actions = hud.querySelector('.hud-actions')!;
    this.sitBtn = document.createElement('button');
    this.sitBtn.type = 'button';
    this.sitBtn.className = 'hud-btn';
    this.sitBtn.addEventListener('click', () => this.setFocused(!this.focused));
    this.actions.append(this.sitBtn, this.notebook.toggle);

    this.el.append(this.scene, this.stage, this.notebook.el, hud);
    document.addEventListener('keydown', this.onKey);
    this.timer = window.setInterval(() => this.render(), 15000);
    this.setFocused(false);
    this.render();
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
    this.el.remove();
  }

  get state(): LevelState {
    return this.opts.state;
  }

  cleared(): number {
    return this.opts.objectives.filter((o) => !o.hidden && this.state.objectives[o.id]).length;
  }

  get done(): boolean {
    return this.cleared() >= this.opts.needed;
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.scene.classList.toggle('focused', focused);
    this.scene.classList.toggle('room', !focused);
    this.el.classList.toggle('is-focused', focused);
    this.sitBtn.textContent = focused ? 'Lean back' : this.opts.sitLabel;
    for (const b of this.scene.querySelectorAll<HTMLButtonElement>('.prop')) b.tabIndex = focused ? -1 : 0;
    if (!this.notebook.userToggled) this.notebook.setOpen(focused && window.matchMedia('(min-width: 1180px)').matches);
    this.onFocus(focused);
  }

  /** Record one attempt; returns nothing. Call award() for progress. */
  attempt(progress: boolean): void {
    if (progress) {
      this.turnsSinceProgress = 0;
      this.lastProgress = performance.now();
    } else {
      this.turnsSinceProgress++;
    }
    this.render();
  }

  get stuck(): number {
    return this.turnsSinceProgress;
  }

  /** Mark an objective and show its placard. */
  async award(id: string, how: 'done' | 'skipped' = 'done'): Promise<void> {
    const o = this.opts.objectives.find((x) => x.id === id);
    if (!o || this.state.objectives[id]) return;
    this.state.objectives[id] = how;
    this.collect(o.placard);
    this.attempt(true);
    this.notebook.flash();
    caption(how === 'done' ? `Notebook: “${o.title}” ✓` : `Notebook: “${o.title}” skipped`);
    if (how === 'skipped') await narrate(o.explain, 'Show me how it works');
    await showPlacard(o.placard);
  }

  /** Add a placard to the museum and save. */
  collect(p: Placard): void {
    if (!this.opts.data.placards.includes(p.id)) this.opts.data.placards.push(p.id);
    this.opts.persist();
  }

  private async skip(id: string): Promise<void> {
    if (this.ending) return;
    await this.award(id, 'skipped');
    this.onSkipped();
  }

  render(): void {
    const since = performance.now() - this.lastProgress;
    const hintLevel = Math.max(Math.floor(this.turnsSinceProgress / TURNS_PER_HINT), Math.floor(since / 60000));
    this.notebook.render({
      objectives: this.state.objectives,
      hintLevel,
      canSkip: !this.ending && (this.turnsSinceProgress >= SKIP_AFTER_TURNS || since >= SKIP_AFTER_MS),
      needed: this.opts.needed,
      placards: this.opts.objectives.map((o) => o.placard).filter((p) => this.opts.data.placards.includes(p.id)),
    });
  }

  private key(e: KeyboardEvent): void {
    if (document.querySelector('.backdrop')) return;
    const t = e.target as HTMLElement;
    const typing = t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.tagName === 'SELECT';
    if (e.key === 'Escape' && this.focused && !typing) this.setFocused(false);
    else if (!typing && (e.key === 'n' || e.key === 'N')) {
      this.notebook.userToggled = true;
      this.notebook.setOpen(!this.notebook.isOpen);
    }
  }
}
