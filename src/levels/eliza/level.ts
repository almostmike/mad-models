// Level 1: ELIZA at Project MAC, 1966.

import { sfx } from '../../audio/sfx';
import { Eliza } from '../../engine/eliza';
import type { SaveData } from '../../save';
import { Notebook } from '../../ui/notebook';
import { caption, narrate, say, showDocument, showPlacard, wait } from '../../ui/overlays';
import { PaperTerminal } from '../../ui/paper';
import { ELIZA_EFFECT, LOGIN_SEQUENCE, OBJECTIVES, PROMPTING_LESSON, SCRIPT_EXCERPT, type Placard } from './content';
import { ART, L1_SCENE } from '../scenes';
import { MUSIC, VOICE } from '../../audio/tracks';
import { PhotoScene } from '../../ui/photo-scene';
import { HintBar } from '../../ui/hintbar';
import { hintTier, SKIP_AFTER_MS, SKIP_AFTER_TURNS } from '../frame';
import type { ObjectiveBase } from '../types';

type PropId = 'terminal' | 'printout' | 'ashtray' | 'coffee' | 'phone' | 'door' | 'diploma' | 'corkboard' | 'window';

/** Objectives needed to finish the level (of six). */
export const NEEDED = 4;

const ALL_PLACARDS: Placard[] = [...OBJECTIVES.map((o) => o.placard), ELIZA_EFFECT, PROMPTING_LESSON];

export interface LevelHooks {
  data: SaveData;
  persist: () => void;
  onComplete: () => void;
}

export class Level1 {
  readonly el: HTMLDivElement;
  private readonly scene = new PhotoScene(L1_SCENE);
  private readonly paper = new PaperTerminal();
  private readonly notebook = new Notebook(OBJECTIVES);
  private readonly hintBar = new HintBar(OBJECTIVES);
  /** Which step of each example "Try it" fills in next. */
  private readonly trySteps = new Map<string, number>();
  private readonly eliza = new Eliza();
  private readonly hooks: LevelHooks;
  private focused = false;
  private started = false;
  private ending = false;
  private turnsSinceProgress = 0;
  private lastProgress = performance.now();
  private readonly timer: number;
  private readonly hud: HTMLDivElement;
  private readonly leanBtn: HTMLButtonElement;
  private readonly skipPrintBtn: HTMLButtonElement;
  private readonly onKey = (e: KeyboardEvent) => this.handleKey(e);

  constructor(hooks: LevelHooks) {
    this.hooks = hooks;
    this.el = document.createElement('div');
    this.el.className = 'level level1';

    this.hud = document.createElement('div');
    this.hud.className = 'hud';
    this.hud.innerHTML = `<p class="where">Project MAC · Cambridge, Mass. · November 1966</p><div class="hud-actions"></div>`;
    const actions = this.hud.querySelector('.hud-actions')!;

    this.leanBtn = document.createElement('button');
    this.leanBtn.type = 'button';
    this.leanBtn.className = 'hud-btn';
    this.leanBtn.addEventListener('click', () => this.setFocused(!this.focused));

    this.skipPrintBtn = document.createElement('button');
    this.skipPrintBtn.type = 'button';
    this.skipPrintBtn.className = 'hud-btn skip-print';
    this.skipPrintBtn.innerHTML = 'Skip <kbd>Esc</kbd>';
    this.skipPrintBtn.hidden = true;
    this.skipPrintBtn.addEventListener('click', () => this.skipPrint());

    actions.append(this.skipPrintBtn, this.leanBtn, this.notebook.toggle);

    const termWrap = document.createElement('div');
    termWrap.className = 'terminal-wrap';
    termWrap.appendChild(this.paper.el);

    this.el.append(this.scene.el, termWrap, this.notebook.el, this.hud, this.hintBar.el);
    this.hintBar.onTry = (o) => this.tryExample(o);
    this.hintBar.onSkip = (id) => void this.skipObjective(id);

    this.scene.onHotspot = (id) => void this.inspect(id as PropId);
    this.paper.onSubmit = (text) => void this.turn(text);
    this.notebook.onSkip = (id) => void this.skipObjective(id);
    this.notebook.onPlacard = (p) => void showPlacard(p, 'Close');
    document.addEventListener('keydown', this.onKey);
    this.timer = window.setInterval(() => this.renderNotebook(), 15000);

    this.setFocused(false);
    this.renderNotebook();
  }

  destroy(): void {
    document.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
    this.scene.destroy();
    sfx.stopHum();
    this.el.remove();
  }

  /** Called once the level is on screen. */
  async begin(): Promise<void> {
    sfx.playMusic(MUSIC.jazz1966, { radio: true });
    await narrate(
      'Project MAC, 545 Technology Square. November 1966. Professor Weizenbaum is away at a conference, and his terminal is free. Rumor has it the machine talks back.',
      'Look around',
    );
    this.scene.hotspotButton('terminal')?.focus({ preventScroll: true });
  }

  private get state() {
    return this.hooks.data.level1;
  }

  private cleared(): number {
    return Object.keys(this.state.objectives).length;
  }

  private handleKey(e: KeyboardEvent): void {
    if (document.querySelector('.backdrop')) return;
    const typing = (e.target as HTMLElement)?.tagName === 'INPUT';
    if (e.key === 'Escape') {
      if (this.paper.locked && this.focused) this.skipPrint();
      else if (this.focused && !typing) this.setFocused(false);
    } else if (!typing && (e.key === 'n' || e.key === 'N')) {
      this.notebook.userToggled = true;
      this.notebook.setOpen(!this.notebook.isOpen);
    }
  }

  private setFocused(focused: boolean): void {
    this.focused = focused;
    this.scene.setFocused(focused);
    this.el.classList.toggle('is-focused', focused);
    this.leanBtn.textContent = focused ? 'Lean back' : 'Sit at the terminal';
    if (!this.notebook.userToggled) {
      this.notebook.setOpen(focused && window.matchMedia('(min-width: 1180px)').matches);
    }
    if (focused) {
      sfx.startHum();
      if (!this.started) void this.startSession();
      else this.paper.focus();
    }
  }

  /** Skip the current printout; during the login, skip the whole login. */
  private skipPrint(): void {
    if (this.loggingIn) this.paper.instant = true;
    this.paper.skip();
  }

  private loggingIn = false;

  private async startSession(): Promise<void> {
    this.started = true;
    this.paper.hold(true);
    this.skipPrintBtn.hidden = false;
    this.loggingIn = true;
    const instant = this.paper.instant;
    if (!this.state.seenLogin) {
      for (const step of LOGIN_SEQUENCE) {
        if (step.machine) await this.paper.print(step.machine, false);
        if (step.typed) {
          await wait(350);
          await this.paper.print(step.typed + '\n', false);
        }
      }
      this.state.seenLogin = true;
      this.hooks.persist();
    } else {
      await this.paper.print('R ELIZA\nEXECUTION.\n\n', false);
    }
    this.paper.instant = instant;
    this.loggingIn = false;
    await this.paper.print(this.eliza.hello + '\n');
    this.skipPrintBtn.hidden = true;
    this.paper.hold(false);
    this.paper.focus();
  }

  private async turn(text: string): Promise<void> {
    if (this.ending) return;
    const reply = this.eliza.respond(text);
    this.skipPrintBtn.hidden = false;
    await this.paper.print(reply.text + '\n');
    this.skipPrintBtn.hidden = true;

    const newly = OBJECTIVES.filter((o) => !this.state.objectives[o.id] && o.detect?.(reply));
    if (newly.length === 0) {
      this.turnsSinceProgress++;
      this.renderNotebook();
      this.paper.focus();
      return;
    }
    this.paper.hold(true);
    for (const o of newly) await this.clearObjective(o.id, 'done');
    this.paper.hold(false);
    if (!(await this.maybeFinish())) this.paper.focus();
  }

  private async clearObjective(id: string, how: 'done' | 'skipped'): Promise<void> {
    const o = OBJECTIVES.find((x) => x.id === id)!;
    this.state.objectives[id] = how;
    if (!this.hooks.data.placards.includes(o.placard.id)) this.hooks.data.placards.push(o.placard.id);
    this.hooks.persist();
    this.turnsSinceProgress = 0;
    this.lastProgress = performance.now();
    this.renderNotebook();
    this.notebook.flash();
    caption(how === 'done' ? `Notebook: “${o.title}” ✓` : `Notebook: “${o.title}” skipped`);
    if (how === 'skipped') await narrate(o.explain, 'Show me how it works');
    await showPlacard(o.placard);
  }

  private async skipObjective(id: string): Promise<void> {
    if (this.state.objectives[id] || this.ending) return;
    await this.clearObjective(id, 'skipped');
    await this.maybeFinish();
  }

  /** The hint strip's "Try it": type the example for the player, or point at the prop. */
  private tryExample(o: ObjectiveBase): void {
    if (!o.example) {
      // "Read the script": lean back and make the printout glow.
      this.setFocused(false);
      const b = this.scene.hotspotButton('printout');
      if (b) {
        b.classList.remove('beckon');
        void b.offsetWidth;
        b.classList.add('beckon');
        b.focus({ preventScroll: true });
      }
      return;
    }
    const i = this.trySteps.get(o.id) ?? 0;
    const steps = o.example.steps;
    this.trySteps.set(o.id, Math.min(i + 1, steps.length - 1));
    if (!this.focused) this.setFocused(true);
    this.paper.suggest(steps[Math.min(i, steps.length - 1)]);
  }

  private async inspect(id: PropId): Promise<void> {
    switch (id) {
      case 'terminal':
        this.setFocused(true);
        return;
      case 'printout':
        await showDocument(
          'DOCTOR — script listing (excerpt)',
          SCRIPT_EXCERPT,
          'Keywords, ranks, patterns and canned replies. This is the whole doctor.',
        );
        if (!this.state.objectives.script) {
          await this.clearObjective('script', 'done');
          await this.maybeFinish();
        }
        return;
      case 'ashtray':
        caption('Lucky Strikes, still smoldering. Not yours.');
        return;
      case 'coffee':
        caption('Cold. It has been here since this morning.');
        return;
      case 'phone':
        caption('A black rotary phone. Extension 6-4321. It does not ring. Yet.');
        return;
      case 'door':
        caption('Frosted glass: PROJECT MAC. Typewriters clatter down the hall.');
        return;
      case 'diploma':
        caption("Someone else's Ph.D. The frame is crooked.");
        return;
      case 'corkboard':
        caption('A photo of the IBM 7094 that runs CTSS, a flowchart, and a terminal sign-up sheet.');
        return;
      case 'window':
        caption('Late sun over Technology Square. Somewhere below, someone is parking a Rambler.');
        return;
    }
  }

  private renderNotebook(): void {
    const since = performance.now() - this.lastProgress;
    const hintLevel = hintTier(this.turnsSinceProgress, since);
    const canSkip = !this.ending && (this.turnsSinceProgress >= SKIP_AFTER_TURNS || since >= SKIP_AFTER_MS);
    const placards = ALL_PLACARDS.filter((p) => this.hooks.data.placards.includes(p.id));
    this.hintBar.render({ objectives: this.state.objectives, level: hintLevel, canSkip });
    if (this.ending) this.hintBar.el.hidden = true;
    this.notebook.render({
      objectives: this.state.objectives,
      hintLevel,
      canSkip,
      needed: NEEDED,
      placards,
    });
  }

  private async maybeFinish(): Promise<boolean> {
    if (this.ending || this.cleared() < NEEDED) return false;
    this.ending = true;
    this.paper.hold(true);
    this.renderNotebook();
    await this.finale();
    return true;
  }

  private async finale(): Promise<void> {
    await wait(1200);
    sfx.knock();
    await wait(700);
    this.setFocused(false);
    this.scene.crossfade(ART.l1Dorothy);
    await wait(1400);
    await say('Dorothy', "Oh! I didn't know anyone was in here. Is that the professor's talking machine?", ['It is', "It's just a program"], VOICE.dorothy1);
    await say(
      'Dorothy',
      'He let me try it last week. Would you mind stepping out for a few minutes? It’s… personal.',
      ['Of course', 'It only matches keywords'],
      VOICE.dorothy2,
    );
    this.scene.setDim(true);
    await wait(600);
    await narrate('You wait in the hallway. Through the frosted glass: the typeball, clattering. Twenty minutes pass.', 'Go back in');
    this.scene.setDim(false);
    await say('Dorothy', 'It really understands me, you know. Better than most people.', ['…'], VOICE.dorothy3);
    this.scene.crossfade(ART.l1);
    await wait(1300);
    if (!this.hooks.data.placards.includes(ELIZA_EFFECT.id)) this.hooks.data.placards.push(ELIZA_EFFECT.id);
    this.hooks.persist();
    await showPlacard(ELIZA_EFFECT);

    this.setFocused(true);
    await wait(1500);
    caption('[the terminal starts printing by itself]');
    await this.paper.print('\nSEE YOU IN 2018.\n');
    sfx.bell();
    await wait(1600);
    if (!this.hooks.data.placards.includes(PROMPTING_LESSON.id)) this.hooks.data.placards.push(PROMPTING_LESSON.id);
    this.state.complete = true;
    this.hooks.persist();
    this.renderNotebook();
    await showPlacard(PROMPTING_LESSON, 'Tear off the printout');
    sfx.tear();
    this.el.classList.add('torn');
    await wait(900);
    this.hooks.onComplete();
  }
}
