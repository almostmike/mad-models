// Level 2: GPT-1, an AI research startup in San Francisco, June 2018.

import { sfx } from '../../audio/sfx';
import { MUSIC } from '../../audio/tracks';
import { generator } from '../../game/generator';
import type { SaveData } from '../../save';
import { caption, narrate, showDocument, showPlacard, wait } from '../../ui/overlays';
import { chatToast, clearToasts } from '../../ui/toast';
import { LevelFrame } from '../frame';
import { Cellbook, type CellRun } from './cellbook';
import { GPT1_CARDS, GPT1_LESSON, GPT1_NEEDED, GPT1_OBJECTIVES, SLACK } from './content';
import { L2_SCENE, L2_WHITEBOARD_NOTE } from '../scenes';

export interface Level2Hooks {
  data: SaveData;
  persist: () => void;
  onComplete: () => void;
}

export class Level2 {
  readonly frame: LevelFrame;
  private readonly book: Cellbook;
  private readonly hooks: Level2Hooks;
  private runs = 0;
  private toldStuck = false;
  private readonly note: HTMLDivElement;

  constructor(hooks: Level2Hooks) {
    this.hooks = hooks;
    this.frame = new LevelFrame({
      className: 'level2',
      where: 'San Francisco · Mission District · June 2018',
      scene: L2_SCENE,
      objectives: GPT1_OBJECTIVES,
      needed: GPT1_NEEDED,
      intro: 'Figure out how to steer a model that only finishes text.',
      state: hooks.data.level2,
      data: hooks.data,
      persist: hooks.persist,
      sitLabel: 'Sit at the desk',
    });
    // The whiteboard's handwriting is drawn by the game, so it can change at the end.
    this.note = document.createElement('div');
    this.note.className = 'wb-note';
    this.note.innerHTML = '<span class="wb-size">117M!!</span><span class="wb-new">1.5B</span><span class="wb-dns">DO NOT SHARE</span>';
    this.frame.photo.addOverlay(this.note, L2_WHITEBOARD_NOTE);
    this.book = new Cellbook(!generator.live);
    this.frame.stage.appendChild(this.book.el);
    this.frame.onFocus = (f) => {
      if (f) this.book.focus();
    };
    this.frame.onProp = (id) => void this.prop(id);
    this.frame.onSkipped = () => void this.maybeFinish();
    this.frame.onMoveOn = () => void this.maybeFinish(true);
    this.frame.onTry = (o) => {
      if (o.example) this.book.suggest(o.example);
    };
    this.book.onRun = (r) => void this.afterRun(r);
  }

  get el(): HTMLDivElement {
    return this.frame.el;
  }

  destroy(): void {
    clearToasts();
    this.frame.destroy();
  }

  async begin(): Promise<void> {
    sfx.playMusic(MUSIC.lofi2018);
    void this.loadModel();
    await narrate(
      'San Francisco, June 2018. A research startup in the Mission: exposed brick, standing desks, a fridge full of LaCroix. This week the team trained a new kind of language model on 7,000 self-published novels. The plan is to fine-tune it for tasks like answering questions. Today you get the raw model, before any of that.',
      'Look around',
    );
    setTimeout(() => chatToast(SLACK.arrive.from, SLACK.arrive.text), 1200);
    this.frame.photo.hotspotButton('monitor')?.focus({ preventScroll: true });
  }

  private async loadModel(): Promise<void> {
    try {
      if (generator.live) {
        await generator.prefetch('gpt1', (p) => this.book.setProgress(p.loaded, p.total));
      } else {
        this.book.setCards(await generator.cards('gpt1'), GPT1_CARDS);
      }
      this.book.setReady(true);
    } catch (e) {
      this.book.setReady(false, (e as Error).message);
    }
  }

  private async prop(id: string): Promise<void> {
    switch (id) {
      case 'monitor':
        this.frame.setFocused(true);
        return;
      case 'whiteboard':
        await showDocument(
          'Whiteboard',
          'TRANSFORMER (decoder only)\n\ntext → tokens (40,478 of them)\n  → 12 layers of attention\n  → probability of every possible next token\n  → pick one (TEMPERATURE!) → repeat\n\ncontext: 512 tokens\ntrained on: BookCorpus (~7,000 books)\n\n117M!!',
          'Someone has circled "TEMPERATURE!" three times.',
        );
        return;
      case 'window':
        caption('Fog over the Mission. Somewhere out there, Karl the Fog has his own social media account.');
        return;
      case 'lacroix':
        caption('Pamplemousse. Warm. Still somehow the most 2018 object in the room.');
        return;
      case 'spinner':
        caption('You spin the fidget spinner. It spins. Nobody remembers why these were a thing.');
        return;
      case 'hoodie':
        caption('A conference hoodie: "NIPS 2017". By the end of this year the conference will rename itself NeurIPS.');
        return;
    }
  }

  private async afterRun(r: CellRun): Promise<void> {
    this.runs++;
    if (this.runs === 1) setTimeout(() => chatToast(SLACK.firstRun.from, SLACK.firstRun.text), 900);
    if (r.redacted) caption('Some words were redacted. Raw 2018 models had no safety training at all.');
    const run = { prompt: r.prompt, output: r.output, temperature: r.temperature, index: this.runs };
    const newly = GPT1_OBJECTIVES.filter((o) => !this.frame.state.objectives[o.id] && o.detect(run));
    this.frame.attempt(newly.some((o) => !o.hidden));
    if (!this.toldStuck && this.frame.stuck >= 4) {
      this.toldStuck = true;
      chatToast(SLACK.stuck.from, SLACK.stuck.text);
    }
    for (const o of newly) await this.frame.award(o.id);
    if (!(await this.maybeFinish())) this.book.focus();
  }

  private async maybeFinish(force = false): Promise<boolean> {
    if (this.frame.ending || !this.frame.done) return false;
    if (!force && !(await this.frame.readyToMoveOn())) return false;
    await this.frame.wrapUp();
    this.frame.ending = true;
    this.frame.render();
    await wait(1200);
    chatToast(SLACK.done.from, SLACK.done.text, 10000);
    await wait(2500);
    this.frame.setFocused(false);
    this.frame.el.classList.add('glitch');
    this.note.classList.add('changed');
    await wait(1600);
    await narrate('Someone has crossed out "117M!!" on the whiteboard and written "1.5B" underneath. Then, smaller: "DO NOT SHARE".', 'Hmm.');
    this.frame.collect(GPT1_LESSON);
    this.hooks.data.level2.complete = true;
    this.hooks.persist();
    await showPlacard(GPT1_LESSON, 'Fast-forward to 2019');
    this.hooks.onComplete();
    return true;
  }
}
