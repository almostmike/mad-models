// The finale: your co-written Chapter 1, typeset like a 2009 fanfic archive.

import type { Team } from './content';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function showFanfic(chapter: string[], team: Team, sparkle: number, sparkleMax: number): Promise<void> {
  const stars = '★'.repeat(Math.max(1, Math.round((sparkle / sparkleMax) * 5))).padEnd(5, '☆');
  const paras = chapter.filter(Boolean);
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.innerHTML = `
      <article class="modal fanfic" role="dialog" aria-modal="true" aria-label="Your chapter">
        <header class="ff-head">
          <p class="ff-site">fanfic.archive · Books » Twilight</p>
          <h2>New Loss</h2>
          <p class="ff-by">by <strong>you</strong> &amp; <strong>GPT-2 (124M)</strong> · Rated T · Romance/Drama · ${team === 'edward' ? 'Edward/Bella' : 'Jacob/Bella'} · Sparkle: ${stars}</p>
          <p class="ff-disclaimer">Disclaimer: I don’t own Twilight. I don’t own anything. I am 124 million parameters.</p>
        </header>
        <h3>Chapter 1</h3>
        ${paras.length ? paras.map((p) => `<p>${esc(p)}</p>`).join('') : '<p><em>(You skipped every beat. GPT-2 respects the mystery.)</em></p>'}
        <p class="ff-an">A/N: omg thank u for reading!! plz review!!! next chapter when GPT-3 comes out xoxo</p>
        <div class="modal-actions"><button type="button" class="btn primary">Publish (to nobody)</button></div>
      </article>`;
    document.body.appendChild(backdrop);
    const btn = backdrop.querySelector('button')!;
    btn.focus();
    btn.addEventListener('click', () => {
      backdrop.remove();
      resolve();
    });
  });
}
