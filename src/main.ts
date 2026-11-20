import './style.css';
import { printSchedule } from './printer';

// Milestone 0 placeholder: ELIZA's opening line typed at roughly IBM 2741 speed.
const LINES = ['HOW DO YOU DO.  PLEASE TELL ME YOUR PROBLEM.', '', 'MAD MODELS IS UNDER CONSTRUCTION.'];

const out = document.getElementById('printout');
if (out) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text = LINES.join('\n');
  if (reduced) {
    out.textContent = text;
  } else {
    for (const { char, at } of printSchedule(text)) {
      setTimeout(() => { out.textContent += char; }, at);
    }
  }
}
