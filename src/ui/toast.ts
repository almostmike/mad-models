// Chat-app toasts for 2018/2019 coworker messages (fictional people).

import { sfx } from '../audio/sfx';

export function chatToast(from: string, text: string, ms = 7000): void {
  let stack = document.querySelector<HTMLDivElement>('.toasts');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toasts';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="avatar" aria-hidden="true"></span><div><p class="who"></p><p class="msg"></p></div>`;
  t.querySelector('.avatar')!.textContent = from[0].toUpperCase();
  t.querySelector('.who')!.textContent = `${from} · #research`;
  t.querySelector('.msg')!.textContent = text;
  stack.appendChild(t);
  sfx.chime();
  setTimeout(() => t.classList.add('leaving'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

export function clearToasts(): void {
  document.querySelector('.toasts')?.remove();
}
