// Modal overlays: museum placards, inspected props and dialogue.

import type { Placard } from '../levels/eliza/content';

let host: HTMLDivElement | null = null;

function getHost(): HTMLDivElement {
  if (!host) {
    host = document.createElement('div');
    host.className = 'overlay-host';
    document.body.appendChild(host);
  }
  return host;
}

interface ModalOptions {
  className: string;
  html: string;
  buttons: { label: string; value: string; primary?: boolean }[];
  label: string;
}

/** Show a modal and resolve with the chosen button's value (Escape picks the last). */
function modal(opts: ModalOptions): Promise<string> {
  const previous = document.activeElement as HTMLElement | null;
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const box = document.createElement('div');
    box.className = `modal ${opts.className}`;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', opts.label);
    box.innerHTML = opts.html + '<div class="modal-actions"></div>';
    const actions = box.querySelector('.modal-actions')!;
    const done = (value: string) => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.classList.add('leaving');
      setTimeout(() => backdrop.remove(), 180);
      previous?.focus?.({ preventScroll: true });
      resolve(value);
    };
    const buttons = opts.buttons.map((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = b.label;
      el.className = b.primary ? 'btn primary' : 'btn';
      el.addEventListener('click', () => done(b.value));
      actions.appendChild(el);
      return el;
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        done(opts.buttons[opts.buttons.length - 1].value);
      } else if (e.key === 'Tab') {
        // keep focus inside the dialog
        const focusables = [...box.querySelectorAll<HTMLElement>('button, [tabindex="0"]')];
        const i = focusables.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        focusables[(i + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length]?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    backdrop.appendChild(box);
    getHost().appendChild(backdrop);
    (buttons.find((_, i) => opts.buttons[i].primary) ?? buttons[0]).focus({ preventScroll: true });
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function showPlacard(p: Placard, button = 'Continue'): Promise<string> {
  return modal({
    className: 'placard',
    label: p.title,
    html: `
      <p class="kicker">${esc(p.kicker)}</p>
      <h2>${esc(p.title)}</h2>
      ${p.body.map((para) => `<p>${esc(para)}</p>`).join('')}
      ${p.thenNow ? `<p class="then-now">${esc(p.thenNow)}</p>` : ''}`,
    buttons: [{ label: button, value: 'ok', primary: true }],
  });
}

export function showDocument(title: string, text: string, note?: string): Promise<string> {
  return modal({
    className: 'document',
    label: title,
    html: `
      <p class="kicker">${esc(title)}</p>
      <pre class="doc-text" tabindex="0">${esc(text)}</pre>
      ${note ? `<p class="doc-note">${esc(note)}</p>` : ''}`,
    buttons: [{ label: 'Put it down', value: 'ok', primary: true }],
  });
}

export function say(speaker: string, line: string, replies: string[] = ['Continue']): Promise<string> {
  return modal({
    className: 'dialogue',
    label: `${speaker} speaks`,
    html: `<p class="speaker">${esc(speaker)}</p><p class="line">${esc(line)}</p>`,
    buttons: replies.map((r, i) => ({ label: r, value: r, primary: i === 0 })),
  });
}

export function narrate(text: string, button = 'Continue'): Promise<string> {
  return modal({
    className: 'narration',
    label: 'Narration',
    html: `<p class="line">${esc(text)}</p>`,
    buttons: [{ label: button, value: 'ok', primary: true }],
  });
}

/** A transient caption, e.g. for sounds. */
export function caption(text: string, ms = 2400): void {
  let bar = document.querySelector<HTMLDivElement>('.captions');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'captions';
    bar.setAttribute('aria-live', 'polite');
    document.body.appendChild(bar);
  }
  const line = document.createElement('div');
  line.textContent = text;
  bar.appendChild(line);
  setTimeout(() => line.classList.add('fade'), ms);
  setTimeout(() => line.remove(), ms + 600);
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
