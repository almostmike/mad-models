// Shared scaffolding for the GPT levels: a first-person room with clickable
// props, a "focused" screen you sit down at, the Lab Notebook, escalating
// hints, skips, placards and saving.

import type { LevelState, SaveData } from '../save';
import { HintBar } from '../ui/hintbar';
import { Notebook } from '../ui/notebook';
import { caption, narrate, showPlacard } from '../ui/overlays';
import { PhotoScene, type PhotoSceneConfig } from '../ui/photo-scene';
import type { ObjectiveBase, Placard } from './types';

export interface FrameOptions {
  className: string;
  where: string;
  /** The photoreal room and its hotspots. */
  scene: PhotoSceneConfig;
  objectives: ObjectiveBase[];
  needed: number;
  intro: string;
  state: LevelState;
  data: SaveData;
  persist: () => void;
  sitLabel: string;
  /** Show the hint strip (Level 3 puts hints on the beat card instead). */
  hintBar?: boolean;
}

export const TURNS_PER_HINT = 2;
export const SKIP_AFTER_TURNS = 5;
export const SKIP_AFTER_MS = 2 * 60 * 1000;
const MS_PER_HINT = 45 * 1000;

/** Hint tier for the notebook and hint strip: starts clear, turns explicit when stuck. */
export function hintTier(turnsSinceProgress: number, msSinceProgress: number): number {
  return 1 + Math.max(Math.floor(turnsSinceProgress / TURNS_PER_HINT), Math.floor(msSinceProgress / MS_PER_HINT));
}

export class LevelFrame {
  readonly el: HTMLDivElement;
  readonly photo: PhotoScene;
  readonly stage: HTMLDivElement;
  readonly actions: HTMLDivElement;
  readonly notebook: Notebook;
  readonly hintBar: HintBar | null;
  focused = false;
  ending = false;
  onFocus: (focused: boolean) => void = () => {};
  onProp: (id: string) => void = () => {};
  onSkipped: () => void = () => {};
  /** The hint strip's "Try it": fill in the objective's example. */
  onTry: (o: ObjectiveBase) => void = () => {};
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

    this.photo = new PhotoScene(opts.scene);
    this.photo.onHotspot = (id) => this.onProp(id);

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

    this.hintBar = opts.hintBar === false ? null : new HintBar(opts.objectives);
    if (this.hintBar) {
      this.hintBar.onTry = (o) => {
        if (!this.focused && o.example) this.setFocused(true);
        this.onTry(o);
      };
      this.hintBar.onSkip = (id) => void this.skip(id);
    }

    this.el.append(this.photo.el, this.stage, this.notebook.el, hud);
    if (this.hintBar) this.el.appendChild(this.hintBar.el);
    document.addEventListener('keydown', this.onKey);
    this.timer = window.setInterval(() => this.render(), 15000);
    this.setFocused(false);
    this.render();
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
    this.photo.destroy();
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
    this.photo.setFocused(focused);
    this.el.classList.toggle('is-focused', focused);
    this.sitBtn.textContent = focused ? 'Lean back' : this.opts.sitLabel;
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
    const hintLevel = hintTier(this.turnsSinceProgress, since);
    const canSkip = !this.ending && (this.turnsSinceProgress >= SKIP_AFTER_TURNS || since >= SKIP_AFTER_MS);
    this.hintBar?.render({ objectives: this.state.objectives, level: this.ending ? 1 : hintLevel, canSkip });
    if (this.hintBar && this.ending) this.hintBar.el.hidden = true;
    this.notebook.render({
      objectives: this.state.objectives,
      hintLevel,
      canSkip,
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
