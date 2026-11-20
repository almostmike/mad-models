import './style.css';
import { Eliza } from './engine/eliza';
import { printSchedule } from './printer';

// Milestone 1 page: talk to the real 1966 ELIZA on a plain sheet of paper.
// (The full 1966 office scene arrives in Milestone 2.)

const paper = document.getElementById('paper') as HTMLDivElement;
const printout = document.getElementById('printout') as HTMLPreElement;
const form = document.getElementById('line') as HTMLFormElement;
const entry = document.getElementById('entry') as HTMLInputElement;
const spoken = document.getElementById('spoken') as HTMLParagraphElement;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const eliza = new Eliza();

function scrollToEnd() {
  paper.scrollTop = paper.scrollHeight;
}

/** Print text onto the paper at the 2741's speed. */
function print(text: string): Promise<void> {
  if (reducedMotion) {
    printout.textContent += text;
    scrollToEnd();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const steps = printSchedule(text);
    const start = performance.now();
    let i = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      while (i < steps.length && steps[i].at <= elapsed) printout.textContent += steps[i++].char;
      scrollToEnd();
      if (i < steps.length) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

/** Like the real 2741 (half duplex), the keyboard locks while the machine prints. */
function setKeyboardLocked(locked: boolean) {
  entry.readOnly = locked;
  paper.classList.toggle('printing', locked);
}

async function elizaSays(text: string) {
  setKeyboardLocked(true);
  spoken.textContent = text;
  await print(text + '\n');
  setKeyboardLocked(false);
  entry.focus({ preventScroll: true });
  scrollToEnd();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const said = entry.value.trim();
  if (!said || entry.readOnly) return;
  entry.value = '';
  printout.textContent += said + '\n';
  void elizaSays(eliza.respond(said).text);
});

paper.addEventListener('click', () => entry.focus({ preventScroll: true }));

void elizaSays(eliza.hello);
