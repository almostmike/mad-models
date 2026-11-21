// The Museum: every placard in the game (collected ones readable, the rest
// still a mystery), plus the sources behind them. Reachable from the title
// screen and the certificate.

import { ELIZA_EFFECT, OBJECTIVES as L1_OBJECTIVES, PROMPTING_LESSON } from '../levels/eliza/content';
import { GPT1_LESSON, GPT1_OBJECTIVES } from '../levels/gpt1/content';
import { BEATS, BOSS_INTRO, GPT2_LESSON, PARODY_NOTE, STAGED_RELEASE } from '../levels/gpt2/content';
import { SAME_PROMPT } from '../finale/finale';
import type { Placard } from '../levels/types';
import { showPlacard } from '../ui/overlays';

export interface Wing {
  title: string;
  placards: Placard[];
}

/** Every placard, in the order the game hands them out. */
export const WINGS: Wing[] = [
  { title: '1966 · ELIZA', placards: [...L1_OBJECTIVES.map((o) => o.placard), ELIZA_EFFECT, PROMPTING_LESSON] },
  { title: '2018 · GPT-1', placards: [...GPT1_OBJECTIVES.map((o) => o.placard), GPT1_LESSON] },
  { title: '2019 · GPT-2', placards: [BOSS_INTRO, ...BEATS.map((b) => b.placard), STAGED_RELEASE, PARODY_NOTE, GPT2_LESSON] },
  { title: 'The finale', placards: [SAME_PROMPT] },
];

export interface Source {
  title: string;
  url: string;
  note: string;
}

/** The primary sources (the full claim-by-claim list is docs/SOURCES.md). */
export const SOURCES: { era: string; items: Source[] }[] = [
  {
    era: '1966',
    items: [
      { title: 'Weizenbaum, “ELIZA”, Communications of the ACM, January 1966', url: 'https://doi.org/10.1145/365153.365168', note: 'The paper, with the DOCTOR script.' },
      { title: 'The original ELIZA source, recovered in 2021 (ELIZAGEN)', url: 'https://sites.google.com/view/elizagen-org/original-eliza', note: 'Found in Weizenbaum’s papers at MIT; released under CC0 by his estate.' },
      { title: 'ELIZA Reanimated (arXiv, 2025)', url: 'https://arxiv.org/abs/2501.06707', note: 'The original running again on an emulated IBM 7094.' },
      { title: 'Anthony Hay’s faithful ELIZA', url: 'https://github.com/anthay/ELIZA', note: 'The engine this game’s ELIZA is ported from.' },
      { title: 'Computer Power and Human Reason (1976)', url: 'https://en.wikipedia.org/wiki/Computer_Power_and_Human_Reason', note: 'Weizenbaum on the secretary, and his warnings.' },
      { title: 'RFC 439: PARRY Encounters the DOCTOR (1972)', url: 'https://www.rfc-editor.org/rfc/rfc439', note: 'Two chatbots, talking over the ARPANET.' },
    ],
  },
  {
    era: '2018',
    items: [
      { title: 'Improving Language Understanding by Generative Pre-Training', url: 'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf', note: 'The GPT-1 paper.' },
      { title: 'OpenAI: Improving language understanding with unsupervised learning', url: 'https://openai.com/index/language-unsupervised/', note: 'The June 11, 2018 announcement.' },
      { title: 'BookCorpus', url: 'https://en.wikipedia.org/wiki/BookCorpus', note: 'What GPT-1 read, and why “unpublished” isn’t quite right.' },
      { title: 'Attention Is All You Need (2017)', url: 'https://arxiv.org/abs/1706.03762', note: 'The Transformer.' },
    ],
  },
  {
    era: '2019',
    items: [
      { title: 'OpenAI: Better Language Models and Their Implications', url: 'https://openai.com/index/better-language-models/', note: 'The February 14, 2019 announcement.' },
      { title: 'Language Models are Unsupervised Multitask Learners', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf', note: 'The GPT-2 paper: WebText, and TL;DR.' },
      { title: 'OpenAI: GPT-2 1.5B release', url: 'https://openai.com/index/gpt-2-1-5b-release/', note: 'The end of the staged release, November 5, 2019.' },
      { title: 'Release Strategies and the Social Impacts of Language Models', url: 'https://arxiv.org/abs/1908.09203', note: 'OpenAI’s report on releasing GPT-2 in stages.' },
    ],
  },
  {
    era: '2022',
    items: [{ title: 'OpenAI: Introducing ChatGPT', url: 'https://openai.com/index/chatgpt/', note: 'November 30, 2022.' }],
  },
];

const SOURCES_DOC = 'https://github.com/almostmike/mad-models/blob/main/docs/SOURCES.md';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Show the museum; resolves when the player leaves. */
export function showMuseum(app: HTMLElement, collected: string[]): Promise<void> {
  const total = WINGS.reduce((n, w) => n + w.placards.length, 0);
  const have = WINGS.reduce((n, w) => n + w.placards.filter((p) => collected.includes(p.id)).length, 0);
  const el = document.createElement('section');
  el.className = 'museum-screen';
  el.innerHTML = `
    <header class="mus-head">
      <div>
        <p class="eyebrow">The museum</p>
        <h1>Placards and sources</h1>
        <p class="mus-lede">${have} of ${total} placards collected.${have < total ? ' Play on to find the rest.' : ' You found them all.'}</p>
      </div>
      <button type="button" class="btn mus-back">Back</button>
    </header>
    <div class="mus-wings"></div>
    <section class="mus-sources" aria-labelledby="mus-src">
      <h2 id="mus-src">Sources</h2>
      <p class="mus-note">Every fact on a placard or in a newsreel is checked against these. Parody is labeled as parody. <a href="${SOURCES_DOC}" target="_blank" rel="noopener">The claim-by-claim list</a> also says what we made up.</p>
      <div class="mus-src-cols"></div>
    </section>`;
  const wings = el.querySelector('.mus-wings')!;
  for (const w of WINGS) {
    const sec = document.createElement('section');
    sec.className = 'mus-wing';
    sec.innerHTML = `<h2>${esc(w.title)}</h2><ul class="mus-grid"></ul>`;
    const grid = sec.querySelector('ul')!;
    for (const p of w.placards) {
      const li = document.createElement('li');
      const found = collected.includes(p.id);
      if (found) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mus-card';
        b.innerHTML = `<span class="mus-kicker">${esc(p.kicker)}</span><span class="mus-title">${esc(p.title)}</span>`;
        b.addEventListener('click', () => void showPlacard(p, 'Close'));
        li.appendChild(b);
      } else {
        li.innerHTML = `<div class="mus-card locked"><span class="mus-kicker">${esc(p.kicker.replace(/ · \d+ of \d+$/, ''))}</span><span class="mus-title">Not found yet</span></div>`;
      }
      grid.appendChild(li);
    }
    wings.appendChild(sec);
  }
  const cols = el.querySelector('.mus-src-cols')!;
  for (const group of SOURCES) {
    const div = document.createElement('div');
    div.innerHTML = `<h3>${group.era}</h3><ul>${group.items
      .map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a><span>${esc(s.note)}</span></li>`)
      .join('')}</ul>`;
    cols.appendChild(div);
  }
  app.appendChild(el);
  const back = el.querySelector<HTMLButtonElement>('.mus-back')!;
  back.focus({ preventScroll: true });
  return new Promise((resolve) => {
    const leave = () => {
      document.removeEventListener('keydown', onKey);
      el.remove();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('.backdrop')) leave();
    };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', leave);
  });
}
