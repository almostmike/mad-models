// "How should this computer run the models?" Asked once, before 2018.

import type { PlayMode } from '../engine/models/capability';
import { generator } from '../game/generator';

export async function chooseMode(saved: PlayMode | null): Promise<PlayMode> {
  if (saved) {
    generator.setMode(saved);
    return saved;
  }
  const cap = await generator.detect();
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const live: PlayMode = cap.webgpu ? 'webgpu' : 'wasm';
    backdrop.innerHTML = `
      <div class="modal machine-room" role="dialog" aria-modal="true" aria-label="How to run the models">
        <p class="kicker">Before 2018 · The machine room</p>
        <h2>The next two levels run the real models</h2>
        <p>GPT-1 (2018) and GPT-2 (2019) are OpenAI's actual released models. They can run right here on your ${cap.mobile ? 'device' : 'computer'}: about 120 MB to download for each, once, and nothing you type leaves your browser.</p>
        <p class="rec"><strong>Recommended: ${cap.recommended === 'archive' ? 'Archive Mode' : 'Run them live'}.</strong> ${cap.reason}</p>
        <div class="mode-options">
          <button type="button" class="btn ${cap.recommended !== 'archive' ? 'primary' : ''}" data-mode="${live}">Run them live</button>
          <button type="button" class="btn ${cap.recommended === 'archive' ? 'primary' : ''}" data-mode="archive">Archive Mode</button>
        </div>
        <p class="fine-dark">Archive Mode plays real outputs we recorded from the same models. You pick from prompt cards instead of typing freely.</p>
      </div>`;
    document.body.appendChild(backdrop);
    const buttons = [...backdrop.querySelectorAll<HTMLButtonElement>('button[data-mode]')];
    (buttons.find((b) => b.classList.contains('primary')) ?? buttons[0]).focus();
    for (const b of buttons) {
      b.addEventListener('click', () => {
        const mode = b.dataset.mode as PlayMode;
        generator.setMode(mode);
        backdrop.remove();
        resolve(mode);
      });
    }
  });
}
