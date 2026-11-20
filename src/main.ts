import './style.css';
import './levels/eliza/level1.css';
import { sfx } from './audio/sfx';
import { Level1 } from './levels/eliza/level';
import { load, reset, save, type SaveData } from './save';
import { caption } from './ui/overlays';

const app = document.getElementById('app')!;
let data: SaveData = load();
const persist = () => save(data);

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

function titleScreen() {
  app.textContent = '';
  const done = data.level1.complete;
  const resumed = Object.keys(data.level1.objectives).length > 0 && !done;
  const t = document.createElement('section');
  t.className = 'title-screen';
  t.innerHTML = `
    <div class="title-card">
      <p class="eyebrow">A short history of prompting, in three machines</p>
      <h1>Mad Models</h1>
      <ol class="eras">
        <li class="era ${done ? 'done' : 'open'}"><span>1966</span> ELIZA</li>
        <li class="era locked"><span>2018</span> GPT-1</li>
        <li class="era locked"><span>2019</span> GPT-2</li>
      </ol>
      <div class="title-actions"></div>
      <p class="fine">Best with sound. Desktop recommended. Ages 13+.</p>
    </div>`;
  const actions = t.querySelector('.title-actions')!;
  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'btn primary big';
  start.textContent = done ? 'Play 1966 again' : resumed ? 'Continue in 1966' : 'Begin in 1966';
  start.addEventListener('click', () => {
    sfx.unlock();
    if (done) {
      data.level1 = { objectives: {}, seenLogin: data.level1.seenLogin, complete: false };
      persist();
    }
    startLevel1();
  });
  actions.appendChild(start);
  if (done || resumed) {
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

function startLevel1() {
  app.textContent = '';
  const level = new Level1({
    data,
    persist,
    onComplete: () => {
      level.destroy();
      endCard();
    },
  });
  app.append(level.el, settingsBar());
  void level.begin();
}

function endCard() {
  app.textContent = '';
  const c = document.createElement('section');
  c.className = 'title-screen end-card';
  c.innerHTML = `
    <div class="title-card">
      <p class="eyebrow">End of 1966</p>
      <h1>See you in 2018</h1>
      <p class="lede">Next stop: a San Francisco startup, a model called GPT-1, and a whole new way to prompt. That era is still being built.</p>
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
