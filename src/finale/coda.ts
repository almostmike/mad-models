// The coda: the screen goes dark, and a modern chat box fades in, dated
// November 30, 2022. The player can type into it. It never answers.

import { sfx } from '../audio/sfx';
import { wait } from '../ui/overlays';

export function runCoda(app: HTMLElement): Promise<void> {
  sfx.stopMusic(2);
  const el = document.createElement('section');
  el.className = 'coda';
  el.setAttribute('aria-label', 'November 30, 2022');
  el.innerHTML = `
    <div class="coda-stage">
      <p class="coda-date">November 30, 2022</p>
      <div class="coda-log" aria-live="polite"></div>
      <form class="coda-box" autocomplete="off">
        <label class="sr-only" for="coda-input">Send a message</label>
        <input id="coda-input" type="text" maxlength="200" placeholder="Send a message" spellcheck="false" />
        <button type="submit" aria-label="Send">↑</button>
      </form>
      <p class="coda-nudge" hidden>Go on. Ask it anything.</p>
    </div>
    <div class="coda-end" hidden>
      <p class="coda-tbc">To be continued.</p>
      <button type="button" class="btn primary coda-cert">Get your certificate</button>
    </div>
    <button type="button" class="coda-skip">Skip</button>`;
  app.appendChild(el);

  const input = el.querySelector<HTMLInputElement>('#coda-input')!;
  const log = el.querySelector<HTMLElement>('.coda-log')!;
  const nudge = el.querySelector<HTMLElement>('.coda-nudge')!;
  const end = el.querySelector<HTMLElement>('.coda-end')!;
  const stage = el.querySelector<HTMLElement>('.coda-stage')!;
  let finished = false;

  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => input.focus({ preventScroll: true }), 2600);
  const nudgeTimer = setTimeout(() => (nudge.hidden = false), 14000);

  const finish = async (typed: boolean) => {
    if (finished) return;
    finished = true;
    clearTimeout(nudgeTimer);
    nudge.hidden = true;
    if (typed) {
      const dots = document.createElement('p');
      dots.className = 'coda-typing';
      dots.setAttribute('aria-label', 'Typing');
      dots.innerHTML = '<span></span><span></span><span></span>';
      log.appendChild(dots);
      await wait(2600);
    }
    stage.classList.add('out');
    el.querySelector<HTMLElement>('.coda-skip')!.hidden = true;
    await wait(1200);
    end.hidden = false;
    sfx.bell();
    end.querySelector<HTMLButtonElement>('button')!.focus({ preventScroll: true });
  };

  el.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || finished) return;
    const bubble = document.createElement('p');
    bubble.className = 'coda-msg';
    bubble.textContent = text;
    log.appendChild(bubble);
    input.value = '';
    input.disabled = true;
    void finish(true);
  });
  el.querySelector('.coda-skip')!.addEventListener('click', () => void finish(false));

  return new Promise((resolve) => {
    el.querySelector('.coda-cert')!.addEventListener('click', () => {
      el.remove();
      resolve();
    });
  });
}
