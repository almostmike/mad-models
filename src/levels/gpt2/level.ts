// Level 3 BOSS: GPT-2, Valentine's Day 2019, after hours.

import { sfx } from '../../audio/sfx';
import { MUSIC } from '../../audio/tracks';
import { generator } from '../../game/generator';
import type { SaveData } from '../../save';
import { caption, narrate, say, showDocument, showPlacard, wait } from '../../ui/overlays';
import { chatToast, clearToasts } from '../../ui/toast';
import { LevelFrame } from '../frame';
import type { ObjectiveBase } from '../types';
import { BEATS, BOSS_INTRO, DAMAGE, GPT2_LESSON, judge, PARODY_NOTE, SLACK_2019, STAGED_RELEASE, type Team } from './content';
import { Demo, type DemoRun } from './demo';
import { showFanfic } from './fanfic';
import { L3_SCENE } from '../scenes';

/** The beats double as notebook objectives so the shared frame tracks them. */
const BEAT_OBJECTIVES: ObjectiveBase[] = BEATS.map((b) => ({
  id: b.id,
  title: b.title.replace(/^Beat \d · /, ''),
  // The beat card on screen carries the detailed, team-specific hints.
  hints: [b.hints[0], b.hints[0], b.hints[0]],
  explain: b.goal,
  placard: b.placard,
}));

const SPARKLE_MAX = 30;
const SKIP_AFTER_FAILS = 3;

export interface Level3Hooks {
  data: SaveData;
  persist: () => void;
  onComplete: () => void;
}

export class Level3 {
  readonly frame: LevelFrame;
  private readonly demo: Demo;
  private readonly hooks: Level3Hooks;
  private coherence = 100;
  private sparkle = 0;
  private fails = 0;
  private team: Team = 'edward';
  private toldDerail = false;

  constructor(hooks: Level3Hooks) {
    this.hooks = hooks;
    this.frame = new LevelFrame({
      className: 'level3',
      where: 'San Francisco · February 14, 2019 · after hours',
      scene: L3_SCENE,
      objectives: BEAT_OBJECTIVES,
      needed: BEATS.length,
      intro: 'Co-write Chapter 1 with GPT-2. Five beats; each teaches a 2019 prompting trick.',
      state: hooks.data.level3,
      data: hooks.data,
      persist: hooks.persist,
      sitLabel: 'Sit at the demo machine',
    });
    this.demo = new Demo(!generator.live);
    this.frame.stage.appendChild(this.demo.el);
    this.frame.onFocus = (f) => {
      if (f) this.demo.focus();
    };
    this.frame.onProp = (id) => void this.prop(id);
    // Skips from the Lab Notebook go through the same path as the beat card.
    this.frame.onSkipped = () => void this.advance();
    this.demo.onRun = (r) => void this.afterRun(r);
    this.demo.onSkip = () => void this.skipBeat();
  }

  get el(): HTMLDivElement {
    return this.frame.el;
  }

  destroy(): void {
    clearToasts();
    this.frame.destroy();
  }

  private get beatIndex(): number {
    return BEATS.findIndex((b) => !this.hooks.data.level3.objectives[b.id]);
  }

  async begin(): Promise<void> {
    sfx.playMusic(MUSIC.boss2019);
    void this.loadModel();
    await narrate(
      'February 14, 2019. Same office, after dark. Rain on the windows, wilting Valentine’s balloons, and a red binder labeled DO NOT RELEASE. Today OpenAI told the world about GPT-2, and that the full model is too risky to publish. The small one is running on the demo machine.',
      'Look around',
    );
    this.frame.collect(BOSS_INTRO);
    await showPlacard(BOSS_INTRO, 'Pick a side');
    const pick = await say('The demo machine', 'Before we begin: Team Edward or Team Jacob?', ['Team Edward', 'Team Jacob']);
    this.team = pick === 'Team Jacob' ? 'jacob' : 'edward';
    this.hooks.data.level3.team = this.team;
    this.hooks.persist();
    setTimeout(() => chatToast(SLACK_2019.intro.from, SLACK_2019.intro.text), 800);
    this.refresh(true);
    this.frame.photo.hotspotButton('monitor')?.focus({ preventScroll: true });
  }

  private async loadModel(): Promise<void> {
    try {
      if (generator.live) await generator.prefetch('gpt2', (p) => this.demo.setProgress(p.loaded, p.total));
      else this.demo.setCards(await generator.cards('gpt2'));
      this.demo.setReady(true);
      this.refresh(false);
    } catch (e) {
      this.demo.setReady(false, (e as Error).message);
    }
  }

  private refresh(newBeat: boolean): void {
    const i = this.beatIndex;
    if (i < 0) return;
    const beat = BEATS[i];
    if (newBeat) this.demo.startBeat(beat, this.team);
    this.demo.showBeat(beat, this.team, Math.floor(this.fails / 1.5), this.fails >= SKIP_AFTER_FAILS, i);
    this.demo.updateHud(this.coherence, this.sparkle, SPARKLE_MAX);
  }

  private async prop(id: string): Promise<void> {
    switch (id) {
      case 'monitor':
        this.frame.setFocused(true);
        return;
      case 'binder':
        await showDocument(
          'DO NOT RELEASE',
          'GPT-2 · 1.5B parameters · release plan\n\nFeb 14: publish the paper and the SMALL model only\nConcerns: fake news, spam, impersonation\nRevisit in a few months\n\nAppendix C: why does it keep writing about vampires\n(see attached: 4,000 samples mentioning Forks, WA)',
          'The binder is fiction. The release plan in it is not: see the placard after the boss.',
        );
        return;
      case 'rack':
        caption('The server rack hums. A pink-purple glow leaks from the vents. That seems fine.');
        return;
      case 'window':
        caption('Rain on the glass. Very Pacific Northwest. Suspiciously so.');
        return;
      case 'balloons':
        caption('Heart balloons from this morning, sinking slowly. Happy Valentine’s Day.');
        return;
      case 'chocolates':
        caption('Half the chocolates are gone. The safety team has been working late.');
        return;
    }
  }

  private async afterRun(r: DemoRun): Promise<void> {
    const i = this.beatIndex;
    if (i < 0 || this.frame.ending) return;
    const beat = BEATS[i];
    const v = judge(beat, { prompt: r.prompt, output: r.output, temperature: r.temperature, team: this.team });
    this.sparkle = Math.min(SPARKLE_MAX, this.sparkle + v.sparkle.length);
    if (v.sparkle.length) sfx.sparkle();
    if (r.redacted) caption('The safety team slapped a sticker on part of that.');

    if (v.pass) {
      this.demo.showVerdict(v.why, 'pass');
      this.hooks.data.level3.chapter[i] = beat.id === 'tldr' ? `TL;DR: ${firstSentences(r.output, 2)}` : passage(r.prompt, r.output);
      this.fails = 0;
      this.demo.updateHud(this.coherence, this.sparkle, SPARKLE_MAX);
      await wait(1400);
      await this.frame.award(beat.id);
      await this.advance();
      return;
    }

    this.fails++;
    this.frame.attempt(false);
    this.coherence -= DAMAGE[v.attack ?? 'miss'];
    if (v.attack && v.attack !== 'miss') {
      sfx.sting();
      this.demo.showVerdict(v.why, 'attack');
      if (v.attack === 'derail' && !this.toldDerail) {
        this.toldDerail = true;
        setTimeout(() => chatToast(SLACK_2019.derail.from, SLACK_2019.derail.text), 1500);
      }
    } else {
      this.demo.showVerdict(v.why, 'fail');
    }
    if (this.coherence <= 0) {
      this.demo.updateHud(0, this.sparkle, SPARKLE_MAX);
      await narrate('Coherence collapsed! GPT-2 has wandered off into the internet. You reboot the demo and pick up where you left off.', 'Reboot');
      this.coherence = 100;
    }
    this.refresh(false);
    this.demo.focus();
  }

  private async skipBeat(): Promise<void> {
    const i = this.beatIndex;
    if (i < 0) return;
    await this.frame.award(BEATS[i].id, 'skipped');
    await this.advance();
  }

  private async advance(): Promise<void> {
    this.fails = 0;
    if (this.beatIndex >= 0) {
      this.refresh(true);
      this.demo.focus();
      return;
    }
    await this.finale();
  }

  private async finale(): Promise<void> {
    if (this.frame.ending) return;
    this.frame.ending = true;
    this.frame.render();
    chatToast(SLACK_2019.win.from, SLACK_2019.win.text, 9000);
    await wait(1500);
    await showFanfic(this.hooks.data.level3.chapter, this.team, this.sparkle, SPARKLE_MAX);
    for (const p of [STAGED_RELEASE, PARODY_NOTE]) {
      this.frame.collect(p);
      await showPlacard(p);
    }
    this.frame.collect(GPT2_LESSON);
    this.hooks.data.level3.complete = true;
    this.hooks.persist();
    await showPlacard(GPT2_LESSON, 'Finish');
    this.hooks.onComplete();
  }
}

/** The passage kept for the fanfic page: the end of the prompt plus GPT-2's words. */
function passage(prompt: string, output: string): string {
  const tail = prompt.replace(/\s*TL;?DR\s*:?\s*$/i, '').slice(-220);
  const out = firstSentences(output, 3);
  return `${tail.startsWith(prompt.slice(0, 10)) ? '' : '…'}${tail} ${out}`.trim();
}

function firstSentences(text: string, n: number): string {
  return text.trim().split(/(?<=[.!?]["”]?)\s+/).slice(0, n).join(' ').slice(0, 320);
}
