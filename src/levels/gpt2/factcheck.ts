// After the TL;DR beat: the player judges the model once. GPT-2's summary
// is shown word by word; the player clicks the words they think it made up,
// then the game reveals which words aren't in their story at all.

import { sfx } from '../../audio/sfx';

const STOP = new Set(
  'the and but for nor yet with from into onto upon about over under after before than then that this these those there their they them she her hers him his its it’s it\'s was were are is be been being has have had will would can could should may might must not too very just also only all any some each every both more most such own same so who whom whose which what when where why how one two three four five out off again once here because while until against between through during above below down further few other our ours you your yours we us me my mine i’m i\'m tl;dr tl dr lot lots sure really thing things something good great much many well way like think know going get got make made said says say year years time people new first last next still even never always ever now today yes yeah okay'
    .split(' '),
);

const norm = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '').replace(/'s$/, '');
/** A rough stem, so "loves" matches "love" and "werewolves" matches "werewolf". */
const stem = (w: string) => (w.length > 4 ? w.replace(/(ing|ed|s|ly)$/, '') : w).replace(/e$/, '').slice(0, 5);

/** Content words in the summary that appear nowhere in the story (loosely matched). */
export function inventedWords(story: string, summary: string): string[] {
  const stems = new Set((story.toLowerCase().match(/[a-z']+/g) ?? []).map((w) => stem(norm(w))));
  const out: string[] = [];
  for (const raw of summary.split(/\s+/)) {
    const w = norm(raw);
    if (w.length < 3 || STOP.has(w)) continue;
    if (stems.has(stem(w))) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

/** The summary to judge: GPT-2's first couple of sentences, about 60 words at most. */
export function summaryOf(output: string): string {
  const text = output.trim().split(/(?<=[.!?]["”]?)\s+/).slice(0, 3).join(' ');
  const ws = text.split(/\s+/);
  return ws.length > 60 ? ws.slice(0, 60).join(' ') + '…' : text;
}

export function factCheck(story: string, output: string): Promise<void> {
  const summary = summaryOf(output);
  const invented = inventedWords(story.replace(/TL;?DR\s*:?\s*$/i, ''), summary);
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.innerHTML = `
      <div class="modal factcheck" role="dialog" aria-modal="true" aria-label="Fact-check GPT-2">
        <p class="kicker">Before you celebrate</p>
        <h2>Fact-check GPT-2</h2>
        <p>Here’s its summary of your story. <strong>Click any word you think it made up</strong>, then check.</p>
        <p class="fc-summary"></p>
        <p class="fc-result" aria-live="polite"></p>
        <div class="modal-actions"><button type="button" class="btn primary fc-check">Check</button></div>
      </div>`;
    const box = backdrop.querySelector<HTMLElement>('.fc-summary')!;
    const words: HTMLButtonElement[] = [];
    for (const raw of summary.split(/\s+/).filter(Boolean)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fc-word';
      b.textContent = raw;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        if (backdrop.classList.contains('checked')) return;
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        sfx.tap();
      });
      words.push(b);
      box.append(b, ' ');
    }
    const result = backdrop.querySelector<HTMLElement>('.fc-result')!;
    const check = backdrop.querySelector<HTMLButtonElement>('.fc-check')!;
    check.addEventListener('click', () => {
      if (backdrop.classList.contains('checked')) {
        backdrop.remove();
        resolve();
        return;
      }
      backdrop.classList.add('checked');
      let caught = 0;
      let wrong = 0;
      for (const b of words) {
        const isNew = invented.includes(norm(b.textContent ?? ''));
        const picked = b.getAttribute('aria-pressed') === 'true';
        b.classList.toggle('invented', isNew);
        if (picked && isNew) caught++;
        if (picked && !isNew) wrong++;
        b.disabled = true;
      }
      const list = invented.slice(0, 6).map((w) => `“${w}”`).join(', ');
      result.textContent = invented.length
        ? `Underlined: words that appear nowhere in your story (${list}${invented.length > 6 ? ', …' : ''}). ${
            caught ? `You caught ${caught}.` : 'You didn’t flag any of them.'
          }${wrong ? ` ${wrong} you flagged were in your story after all.` : ''} Some may be harmless rewording; the rest GPT-2 simply made up, in the same confident tone.`
        : 'Every word here comes from your story. GPT-2 stuck to the facts this time. Often it doesn’t.';
      sfx.chime();
      check.textContent = 'Continue';
      check.focus();
    });
    document.body.appendChild(backdrop);
    (words[0] ?? check).focus();
  });
}
