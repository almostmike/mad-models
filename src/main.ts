import './style.css';
import './ui/photo-scene.css';
import './levels/eliza/level1.css';
import './levels/gpt1/level2.css';
import './levels/gpt2/level3.css';
import { sfx } from './audio/sfx';
import { generator } from './game/generator';
import { Level1 } from './levels/eliza/level';
import { Level2 } from './levels/gpt1/level';
import { Level3 } from './levels/gpt2/level';
import { ART } from './levels/scenes';
import { MUSIC } from './audio/tracks';
import { load, reset, save, type SaveData } from './save';
import { JUMP_1966_2018, JUMP_2018_2019, playReel } from './ui/era-jump';
import { chooseMode } from './ui/machine-room';
import { caption, showDocument } from './ui/overlays';

const app = document.getElementById('app')!;
let data: SaveData = load();
const persist = () => save(data);

document.documentElement.style.setProperty('--hero', `url("${ART.l1}")`);
sfx.muted = data.settings.muted;
sfx.onCaption = (t) => caption(t);
applyReadable();

function applyReadable() {
  document.documentElement.classList.toggle('readable', data.settings.readable);
}

/** Small settings cluster, always available. */
function settingsBar(): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'settings';
  const sound = document.createElement('button');
  const readable = document.createElement('button');
  sound.type = readable.type = 'button';
  sound.className = readable.className = 'hud-btn';
  const sync = () => {
    sound.textContent = data.settings.muted ? 'Sound off' : 'Sound on';
    sound.setAttribute('aria-pressed', String(!data.settings.muted));
    readable.textContent = 'Readable';
    readable.setAttribute('aria-pressed', String(data.settings.readable));
  };
  sound.addEventListener('click', () => {
    sfx.unlock();
    data.settings.muted = !data.settings.muted;
    sfx.muted = data.settings.muted;
    persist();
    sync();
  });
  readable.addEventListener('click', () => {
    data.settings.readable = !data.settings.readable;
    applyReadable();
    persist();
    sync();
  });
  readable.title = 'Crisp text, higher contrast, no ink effects';
  sync();
  bar.append(sound, readable);
  return bar;
}

type LevelKey = 1 | 2 | 3;

function unlocked(n: LevelKey): boolean {
  return n === 1 || (n === 2 ? data.level1.complete : data.level2.complete);
}

function nextLevel(): LevelKey {
  if (!data.level1.complete) return 1;
  if (!data.level2.complete) return 2;
  return 3;
}

const ERA_LABELS: Record<LevelKey, [string, string]> = { 1: ['1966', 'ELIZA'], 2: ['2018', 'GPT-1'], 3: ['2019', 'GPT-2'] };

function titleScreen() {
  sfx.playMusic(MUSIC.jazz1966); // only plays once audio has been unlocked by a click
  app.textContent = '';
  const t = document.createElement('section');
  t.className = 'title-screen';
  t.innerHTML = `
    <div class="title-card">
      <p class="eyebrow">A short history of prompting, in three machines</p>
      <h1>Mad Models</h1>
      <ol class="eras"></ol>
      <div class="title-actions"></div>
      <p class="fine">Best with sound. Desktop recommended. Ages 13+.</p>
    </div>`;
  const eras = t.querySelector('.eras')!;
  for (const n of [1, 2, 3] as LevelKey[]) {
    const li = document.createElement('li');
    const complete = [data.level1, data.level2, data.level3][n - 1].complete;
    li.className = `era ${complete ? 'done' : unlocked(n) ? 'open' : 'locked'}`;
    if (unlocked(n)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<span>${ERA_LABELS[n][0]}</span> ${ERA_LABELS[n][1]}`;
      b.setAttribute('aria-label', `Play ${ERA_LABELS[n][0]}: ${ERA_LABELS[n][1]}`);
      b.addEventListener('click', () => {
        sfx.unlock();
        void play(n, true);
      });
      li.appendChild(b);
    } else {
      li.innerHTML = `<span>${ERA_LABELS[n][0]}</span> ${ERA_LABELS[n][1]}`;
    }
    eras.appendChild(li);
  }
  const actions = t.querySelector('.title-actions')!;
  const n = nextLevel();
  const allDone = data.level3.complete;
  const started = Object.keys(data.level1.objectives).length > 0 || data.level1.complete;
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'btn primary big';
  start.textContent = allDone ? 'Play again from 1966' : started ? `Continue in ${ERA_LABELS[n][0]}` : 'Begin in 1966';
  start.addEventListener('click', () => {
    sfx.unlock();
    void play(allDone ? 1 : n, allDone);
  });
  actions.appendChild(start);
  const credits = document.createElement('button');
  credits.type = 'button';
  credits.className = 'btn';
  credits.textContent = 'Credits';
  credits.addEventListener('click', () => void showCredits());
  actions.appendChild(credits);
  if (started) {
    const fresh = document.createElement('button');
    fresh.type = 'button';
    fresh.className = 'btn';
    fresh.textContent = 'Start over';
    fresh.addEventListener('click', () => {
      data = reset();
      sfx.muted = data.settings.muted;
      applyReadable();
      titleScreen();
    });
    actions.appendChild(fresh);
  }
  app.append(t, settingsBar());
  start.focus({ preventScroll: true });
}

/** Run a level (fresh = replay from scratch), then continue the story. */
async function play(n: LevelKey, fresh = false): Promise<void> {
  if (n === 1) {
    if (fresh) data.level1 = { objectives: {}, seenLogin: data.level1.seenLogin, complete: false };
    persist();
    await runLevel1();
    await playReel(JUMP_1966_2018);
    return play(2);
  }
  data.playMode = await chooseMode(data.playMode);
  persist();
  if (n === 2) {
    if (fresh) data.level2 = { objectives: {}, complete: false };
    persist();
    await runGpt((done) => new Level2({ data, persist, onComplete: done }), true);
    await playReel(JUMP_2018_2019);
    return play(3);
  }
  if (fresh || data.level3.complete) data.level3 = { objectives: {}, complete: false, team: null, chapter: [] };
  persist();
  await runGpt((done) => new Level3({ data, persist, onComplete: done }));
  endCard();
}

function runLevel1(): Promise<void> {
  return new Promise((resolve) => {
    app.textContent = '';
    const level = new Level1({
      data,
      persist,
      onComplete: () => {
        level.destroy();
        resolve();
      },
    });
    app.append(level.el, settingsBar());
    void level.begin();
  });
}

interface GptLevel {
  el: HTMLElement;
  begin(): Promise<void>;
  destroy(): void;
}

/** Mount a GPT level and resolve when it completes. */
function runGpt(make: (done: () => void) => GptLevel, prefetchGpt2 = false): Promise<void> {
  return new Promise((resolve) => {
    app.textContent = '';
    const level: GptLevel = make(() => {
      level.destroy();
      resolve();
    });
    app.append(level.el, settingsBar());
    void level.begin();
    // Download GPT-2 while the player is busy in 2018 (live mode only).
    if (prefetchGpt2 && generator.live) void generator.prefetch('gpt2').catch(() => undefined);
  });
}

function endCard() {
  sfx.playMusic(MUSIC.jazz1966);
  app.textContent = '';
  const c = document.createElement('section');
  c.className = 'title-screen end-card';
  c.innerHTML = `
    <div class="title-card">
      <p class="eyebrow">1966 · 2018 · 2019</p>
      <h1>To be continued</h1>
      <p class="lede">You prompted three real machines: a pattern-matcher on a typewriter, a document-finisher that read 7,000 novels, and a model that read the internet. On November 30, 2022, a chat box changed the rules. The finale is still being built.</p>
      <div class="title-actions"></div>
    </div>`;
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'btn primary big';
  back.textContent = 'Back to the title';
  back.addEventListener('click', titleScreen);
  c.querySelector('.title-actions')!.appendChild(back);
  app.append(c, settingsBar());
  back.focus({ preventScroll: true });
}

titleScreen();

function showCredits(): Promise<string> {
  return showDocument(
    'Credits',
    [
      'ELIZA (1966): Joseph Weizenbaum, MIT. Original source released',
      '  under CC0 by the Weizenbaum estate. Engine ported from Anthony',
      "  Hay's faithful simulation (CC0). DOCTOR script: CACM, Jan 1966.",
      '',
      'GPT-1 (2018) and GPT-2 (2019): OpenAI, MIT License. Run in your',
      '  browser with Transformers.js (Hugging Face) and ONNX Runtime.',
      '',
      'Scene images: made with ChatGPT image generation (OpenAI).',
      'Music: made with Suno (suno.com).',
      "Dorothy's voice: made with ElevenLabs (elevenlabs.io).",
      'Sound effects: synthesized live in your browser.',
      '',
      'Twilight belongs to Stephenie Meyer. Level 3 is parody.',
    ].join('\n'),
    'Made with Claude. Source: github.com/almostmike/mad-models',
  );
}
