// Newsreel interstitials between eras. Built from type, not video.
// Every line is a sourced fact (docs/SOURCES.md).

import { sfx } from '../audio/sfx';

export interface Reel {
  from: string;
  to: string;
  frames: { year: string; headline: string }[];
}

export const JUMP_1966_2018: Reel = {
  from: '1966',
  to: '2018',
  frames: [
    { year: '1970', headline: 'SHRDLU, at MIT, moves blocks around a world that exists only in a computer, and talks about it.' },
    { year: '1972', headline: 'PARRY, a program that plays a paranoid patient, is wired to ELIZA\u2019s DOCTOR over the ARPANET. They have a conversation.' },
    { year: '1973', headline: 'The Lighthill Report doubts AI will deliver. Funding dries up: the first "AI winter".' },
    { year: '1987', headline: 'The expert-systems boom busts. The second AI winter begins.' },
    { year: '1997', headline: 'IBM’s Deep Blue beats world chess champion Garry Kasparov.' },
    { year: '2012', headline: 'A neural network called AlexNet wins the ImageNet contest by a landslide. Deep learning arrives.' },
    { year: '2017', headline: 'Eight researchers, mostly at Google, publish "Attention Is All You Need". It describes the Transformer.' },
    { year: '2018', headline: 'June. A San Francisco lab trains a Transformer on 7,000 self-published novels.' },
  ],
};

export const JUMP_2018_2019: Reel = {
  from: '2018',
  to: '2019',
  frames: [
    { year: '2018', headline: 'October. Google’s BERT reads text in both directions and tops the leaderboards.' },
    { year: '2019', headline: 'February 14. OpenAI announces GPT-2: more than ten times bigger, trained on 8 million web pages.' },
    { year: '2019', headline: 'OpenAI holds back the full model, citing misuse concerns. Headlines call it "too dangerous to release".' },
  ],
};

export function playReel(reel: Reel): Promise<void> {
  sfx.stopMusic(2);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise((resolve) => {
    const el = document.createElement('section');
    el.className = 'reel';
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<div class="grain"></div><div class="reel-frame"><p class="reel-year"></p><p class="reel-headline"></p></div>
      <p class="reel-span">${reel.from} → ${reel.to}</p><button type="button" class="hud-btn reel-skip">Skip <kbd>Esc</kbd></button>`;
    document.body.appendChild(el);
    const year = el.querySelector('.reel-year')!;
    const headline = el.querySelector('.reel-headline')!;
    let i = 0;
    let timer = 0;
    const finish = () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      el.classList.add('leaving');
      setTimeout(() => {
        el.remove();
        resolve();
      }, 400);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    const next = () => {
      clearTimeout(timer);
      if (i >= reel.frames.length) return finish();
      const f = reel.frames[i++];
      year.textContent = f.year;
      headline.textContent = f.headline;
      el.classList.remove('flip');
      void el.offsetWidth;
      el.classList.add('flip');
      sfx.lineFeed();
      timer = window.setTimeout(next, reduced ? 6000 : 3800);
    };
    el.querySelector('.reel-skip')!.addEventListener('click', finish);
    el.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.reel-skip')) next();
    });
    document.addEventListener('keydown', onKey);
    next();
  });
}
