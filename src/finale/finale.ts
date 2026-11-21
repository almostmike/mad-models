// The finale: one prompt, three machines, side by side. ELIZA answers on
// paper, GPT-1 in the 2018 notebook, GPT-2 in the 2019 web demo. All three
// are the real things (or, in Archive Mode, real recordings of them).

import { sfx } from '../audio/sfx';
import { Eliza } from '../engine/eliza';
import { redact } from '../engine/models/safety';
import { generator } from '../game/generator';
import type { Placard } from '../levels/types';
import { CHARS_PER_SECOND } from '../printer';
import type { SaveData } from '../save';
import { narrate, showPlacard, wait } from '../ui/overlays';

/** Suggested prompts; each has real recordings for Archive Mode (tools/archive/prompts.json). */
export const FINALE_CARDS = [
  { id: 'finale-poem', prompt: 'Can you help me write a poem?' },
  { id: 'finale-love', prompt: 'I love you.' },
  { id: 'finale-alive', prompt: 'Are you alive?' },
  { id: 'finale-meaning', prompt: 'What is the meaning of life?' },
];

export const SAME_PROMPT: Placard = {
  id: 'finale-same-prompt',
  kicker: 'The finale',
  title: 'Same words, three machines',
  body: [
    'ELIZA looked for a keyword and pasted your words into a template. GPT-1 guessed what comes next in a novel. GPT-2 guessed what comes next on a web page. None of them answered you, because none of them was built to.',
    'Every trick you learned (trigger words, priming, temperature, examples, TL;DR) was a way of working around that.',
  ],
  thenNow: 'Then: you worked around the machine. Now: the machine is trained to work with you.',
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Run the finale screen; resolves when the player moves on to the coda. */
export async function runFinale(app: HTMLElement, data: SaveData, persist: () => void): Promise<void> {
  const live = generator.live;
  const el = document.createElement('section');
  el.className = 'finale';
  el.innerHTML = `
    <header class="fin-head">
      <p class="eyebrow">The finale</p>
      <h1>Same prompt, three machines</h1>
      <p class="fin-sub">${live ? 'Type anything, or pick one.' : 'Archive Mode: pick a prompt. Every answer is a real recording.'} All three machines get exactly the same words.</p>
      <form class="fin-form" autocomplete="off">
        <label class="sr-only" for="fin-prompt">Your prompt</label>
        <input id="fin-prompt" type="text" maxlength="120" spellcheck="false" ${live ? '' : 'readonly'} placeholder="${live ? 'Type a prompt…' : 'Pick a prompt below'}" />
        <button type="submit" class="btn primary">Send to all three</button>
      </form>
      <div class="fin-chips" role="group" aria-label="Suggested prompts">
        ${FINALE_CARDS.map((c) => `<button type="button" class="chip" data-id="${c.id}">${esc(c.prompt)}</button>`).join('')}
      </div>
    </header>
    <div class="fin-cols">
      <section class="fin-col eliza" aria-label="1966: ELIZA">
        <p class="fin-era"><span>1966</span> ELIZA · IBM 2741</p>
        <div class="fin-paper"><pre class="fin-out" aria-live="polite"></pre></div>
        <p class="fin-why"></p>
      </section>
      <section class="fin-col gpt1" aria-label="2018: GPT-1">
        <p class="fin-era"><span>2018</span> GPT-1 · 117M</p>
        <div class="fin-cell"><p class="fin-in"></p><pre class="fin-out"><span class="p"></span><span class="g"></span></pre></div>
        <p class="fin-why"></p>
      </section>
      <section class="fin-col gpt2" aria-label="2019: GPT-2">
        <p class="fin-era"><span>2019</span> GPT-2 · 124M</p>
        <div class="fin-demo"><pre class="fin-out"><span class="p"></span><span class="g"></span></pre></div>
        <p class="fin-why"></p>
      </section>
    </div>
    <p class="sr-only fin-live" aria-live="polite"></p>
    <footer class="fin-foot" hidden>
      <button type="button" class="btn fin-what">✦ What does this show?</button>
      <button type="button" class="btn fin-again">Try another prompt</button>
      <button type="button" class="btn primary fin-next">What happened next →</button>
    </footer>`;
  app.appendChild(el);

  const input = el.querySelector<HTMLInputElement>('#fin-prompt')!;
  const form = el.querySelector<HTMLFormElement>('.fin-form')!;
  const send = form.querySelector<HTMLButtonElement>('button')!;
  const chips = [...el.querySelectorAll<HTMLButtonElement>('.chip')];
  const foot = el.querySelector<HTMLElement>('.fin-foot')!;
  const srLive = el.querySelector<HTMLElement>('.fin-live')!;
  const cols = {
    eliza: el.querySelector<HTMLElement>('.fin-col.eliza')!,
    gpt1: el.querySelector<HTMLElement>('.fin-col.gpt1')!,
    gpt2: el.querySelector<HTMLElement>('.fin-col.gpt2')!,
  };
  let cardId: string | null = null;
  let busy = false;
  let rounds = 0;

  for (const c of chips) {
    c.addEventListener('click', () => {
      input.value = c.textContent ?? '';
      cardId = c.dataset.id ?? null;
      chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      if (live) input.focus();
      else void go();
    });
  }
  input.addEventListener('input', () => {
    // A typed prompt only matches a card if it's word for word the same.
    cardId = FINALE_CARDS.find((c) => c.prompt === input.value.trim())?.id ?? null;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void go();
  });

  // Warm both models while the player thinks (they're cached from the levels).
  if (live) {
    void generator.prefetch('gpt1').catch(() => undefined);
    void generator.prefetch('gpt2').catch(() => undefined);
  }

  await narrate(
    'One last experiment. Somebody has wheeled the 1966 terminal, the 2018 notebook and the 2019 demo machine onto one desk. Type one prompt, and all three machines get it.',
    'Pull up a chair',
  );
  (live ? input : chips[0]).focus({ preventScroll: true });

  async function go(): Promise<void> {
    const prompt = input.value.trim();
    if (busy || !prompt) return;
    if (!live && !cardId) return;
    busy = true;
    rounds++;
    send.disabled = true;
    chips.forEach((c) => (c.disabled = true));
    foot.hidden = true;
    for (const c of Object.values(cols)) {
      c.classList.remove('done');
      c.querySelector<HTMLElement>('.fin-why')!.textContent = '';
    }
    data.finale.prompt = prompt;
    persist();

    // 1966: ELIZA, struck onto paper.
    const reply = new Eliza().respond(prompt);
    const paper = cols.eliza.querySelector<HTMLElement>('.fin-out')!;
    paper.textContent = `${prompt.toUpperCase()}\n`;
    cols.eliza.classList.add('active');
    reveal(cols.eliza);
    await typewrite(paper, reply.text);
    cols.eliza.classList.replace('active', 'done');
    cols.eliza.querySelector('.fin-why')!.textContent =
      reply.source === 'keyword' && reply.keyword
        ? `Spotted the keyword “${reply.keyword}” and filled in a template.`
        : reply.source === 'memory'
          ? 'Played back something you said earlier.'
          : 'No keyword it knew, so: a stock line.';

    // 2018 and 2019: the real models continue the text.
    const outputs: string[] = [];
    for (const [model, col, why] of [
      ['gpt1', cols.gpt1, 'Wrote what might come next in a novel.'],
      ['gpt2', cols.gpt2, 'Wrote what might come next on a web page.'],
    ] as const) {
      col.classList.add('active');
      reveal(col);
      const p = col.querySelector<HTMLElement>('.p')!;
      const g = col.querySelector<HTMLElement>('.g')!;
      p.textContent = prompt;
      g.textContent = '';
      col.classList.toggle('loading', live);
      let text = '';
      try {
        const run = generator.run(
          { model, prompt, options: { temperature: 0.8, maxNewTokens: 50, topK: model === 'gpt1' ? 0 : 40 }, cardId: cardId ?? undefined },
          (chunk) => {
            col.classList.remove('loading');
            g.textContent += chunk;
          },
        );
        text = redact((await run.result).text, model === 'gpt1' ? 'plain' : 'sticker').text;
        g.textContent = text;
      } catch (e) {
        g.textContent = ` [couldn’t run: ${(e as Error).message}]`;
      }
      outputs.push(text);
      col.classList.remove('loading', 'active');
      col.classList.add('done');
      col.querySelector('.fin-why')!.textContent = why;
    }
    srLive.textContent = `ELIZA: ${reply.text}. GPT-1: ${outputs[0]}. GPT-2: ${outputs[1]}.`;

    busy = false;
    send.disabled = false;
    chips.forEach((c) => (c.disabled = false));
    foot.hidden = false;
    reveal(foot);
    if (!data.placards.includes(SAME_PROMPT.id)) data.placards.push(SAME_PROMPT.id);
    persist();
    // Let the three answers breathe: the explanation waits behind a button.
    el.querySelector<HTMLButtonElement>('.fin-what')!.focus({ preventScroll: true });
  }

  return new Promise((resolve) => {
    el.querySelector('.fin-again')!.addEventListener('click', () => {
      foot.hidden = true;
      input.value = '';
      cardId = null;
      chips.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      (live ? input : chips[0]).focus();
    });
    let read = false;
    el.querySelector('.fin-what')!.addEventListener('click', async () => {
      read = true;
      await showPlacard(SAME_PROMPT, 'Close');
    });
    el.querySelector('.fin-next')!.addEventListener('click', async () => {
      if (!read) await showPlacard(SAME_PROMPT);
      el.remove();
      resolve();
    });
  });
}

/** On narrow screens the columns stack: keep the one that's working in view. */
function reveal(el: HTMLElement): void {
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
}

/** Strike text onto the finale paper at 2741 speed (instant with reduced motion). */
async function typewrite(target: HTMLElement, text: string): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.textContent += text + '\n';
    return;
  }
  const perChar = 1000 / CHARS_PER_SECOND;
  for (const ch of text) {
    target.textContent += ch;
    if (ch === ' ') sfx.space();
    else sfx.strike();
    await wait(perChar);
  }
  target.textContent += '\n';
  sfx.carriageReturn();
}
