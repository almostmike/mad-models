// The certificate: a PNG drawn in the browser on fanfold teletype paper.
// Nothing is uploaded; the player downloads or shares the file themselves.

import { sfx } from '../audio/sfx';
import type { SaveData } from '../save';
import { showMuseum } from '../museum/museum';

export interface CertInfo {
  name: string;
  team: 'edward' | 'jacob' | null;
  tldr: string | null;
  prompt: string | null;
  playMs: number;
  tricks: [number, number, number];
  totals: [number, number, number];
  date: Date;
}

export const CERT_W = 1200;
export const CERT_H = 1500;
const SITE = 'almostmike.github.io/mad-models';

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} MIN ${String(s % 60).padStart(2, '0')} SEC` : `${s} SEC`;
}

/** Wrap text to lines of at most n characters (monospace). */
export function wrap(text: string, n: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + w).length > n) {
      out.push(line);
      line = '';
    }
    line = line ? `${line} ${w}` : w.slice(0, n);
  }
  if (line) out.push(line);
  return out;
}

/** Keep at most n lines, ending the last with an ellipsis if anything was cut. */
function clip(lines: string[], n: number): string[] {
  if (lines.length <= n) return lines;
  const kept = lines.slice(0, n);
  kept[n - 1] = kept[n - 1].replace(/[\s"”]*$/, '').slice(0, 48) + '…"';
  return kept;
}

/** Draw the certificate. Ink jitter is seeded so redraws (typing a name) don't shimmer. */
export function drawCertificate(canvas: HTMLCanvasElement, info: CertInfo): void {
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d')!;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // Paper, with a faint warm vignette.
  ctx.fillStyle = '#f3ead6';
  ctx.fillRect(0, 0, CERT_W, CERT_H);
  const g = ctx.createRadialGradient(CERT_W / 2, CERT_H / 2, CERT_H * 0.3, CERT_W / 2, CERT_H / 2, CERT_H * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(120,90,40,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CERT_W, CERT_H);

  // Tractor-feed margins: pin holes and a perforation line on each side.
  for (const x of [38, CERT_W - 38]) {
    for (let y = 30; y < CERT_H; y += 60) {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#2a2018';
      ctx.fill();
    }
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(80,60,30,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const px = x < CERT_W / 2 ? 76 : CERT_W - 76;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, CERT_H);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Fanfold crease.
  ctx.fillStyle = 'rgba(80,60,30,0.07)';
  ctx.fillRect(76, CERT_H / 2 - 2, CERT_W - 152, 4);

  const ink = (text: string, x: number, y: number, size: number, opts: { bold?: boolean; align?: CanvasTextAlign; color?: string } = {}) => {
    ctx.font = `${opts.bold ? 700 : 400} ${size}px "Courier Prime", "Courier New", monospace`;
    ctx.textBaseline = 'alphabetic';
    const w = ctx.measureText(text).width;
    let cx = opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x;
    for (const ch of text) {
      ctx.globalAlpha = 0.78 + rand() * 0.22;
      ctx.fillStyle = opts.color ?? '#1d1a16';
      ctx.fillText(ch, cx + (rand() - 0.5) * 1.2, y + (rand() - 0.5) * 1.6);
      cx += ctx.measureText(ch).width;
    }
    ctx.globalAlpha = 1;
  };

  const L = 130;
  const R = CERT_W - 130;
  const C = CERT_W / 2;
  const d = info.date;
  const stamp = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;

  ink('MIT8C0  CTSS', L, 120, 24);
  ink(`${stamp}  ${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.0`, R, 120, 24, { align: 'right' });
  ink('R CERTIFY', L, 160, 24);
  ink('-'.repeat(52), C, 215, 24, { align: 'center' });

  ink('CERTIFICATE OF PROMPTING', C, 300, 60, { bold: true, align: 'center' });
  ink('-'.repeat(52), C, 350, 24, { align: 'center' });

  ink('THIS IS TO CERTIFY THAT', C, 440, 28, { align: 'center' });
  const name = (info.name.trim() || 'AN ANONYMOUS PROMPTER').toUpperCase().slice(0, 28);
  ink(name, C, 525, 54, { bold: true, align: 'center', color: '#7a1f12' });
  ctx.fillStyle = 'rgba(29,26,22,0.5)';
  ctx.fillRect(C - 360, 548, 720, 2);
  ink('HAS PROMPTED THREE REAL MACHINES', C, 610, 28, { align: 'center' });
  ink('AND LIVED TO TELL THE TALE.', C, 650, 28, { align: 'center' });

  const rows: [string, string, string][] = [
    ['1966', 'ELIZA (DOCTOR)', `${info.tricks[0]} OF ${info.totals[0]} TRICKS`],
    ['2018', 'GPT-1, 117M', `${info.tricks[1]} OF ${info.totals[1]} TRICKS`],
    ['2019', 'GPT-2, 124M', `${info.tricks[2]} OF ${info.totals[2]} BEATS`],
  ];
  let y = 730;
  for (const [yr, model, score] of rows) {
    ink(yr, L + 20, y, 30, { bold: true });
    ink(model, L + 140, y, 30);
    ink(score, R - 20, y, 30, { align: 'right' });
    y += 48;
  }
  ink(info.team ? `TEAM ${info.team.toUpperCase()}` : 'TEAM UNDECIDED', L + 140, y, 30, { color: '#7a1f12' });
  y += 80;

  ink('BEST TL;DR:', L + 20, y, 26, { bold: true });
  y += 42;
  const tldr = (info.tldr ?? '(SKIPPED. WE WON’T TELL.)').replace(/^TL;?DR:\s*/i, '');
  for (const line of clip(wrap(`"${tldr}"`, 50), 3)) {
    ink(line, L + 20, y, 26);
    y += 36;
  }
  if (info.prompt) {
    y += 20;
    ink('FINAL PROMPT:', L + 20, y, 26, { bold: true });
    y += 42;
    ink(clip(wrap(`"${info.prompt}"`, 50), 1)[0], L + 20, y, 26);
    y += 36;
  }

  const foot = Math.max(y + 40, CERT_H - 230);
  ink(`TIME: ${formatTime(info.playMs)}`, L + 20, foot, 28, { bold: true });
  ink('SEE YOU IN 2022.', R - 20, foot, 28, { bold: true, align: 'right' });
  ink('-'.repeat(52), C, CERT_H - 190, 24, { align: 'center' });
  ink('MAD MODELS · A SHORT HISTORY OF PROMPTING', C, CERT_H - 140, 24, { align: 'center' });
  ink(SITE.toUpperCase(), C, CERT_H - 100, 22, { align: 'center', color: '#5b4f40' });
}

/** Everything the certificate shows, gathered from the save. */
export function certInfo(data: SaveData, totals: [number, number, number]): CertInfo {
  const done = (o: Record<string, string>) => Object.values(o).filter((v) => v === 'done').length;
  return {
    name: data.finale.name,
    team: data.level3.team,
    tldr: data.level3.chapter[4] || null,
    prompt: data.finale.prompt,
    playMs: data.stats.playMs,
    tricks: [done(data.level1.objectives), done(data.level2.objectives), done(data.level3.objectives)],
    totals,
    date: new Date(),
  };
}

/** The certificate screen: preview, optional name, download and share. */
export async function showCertificate(app: HTMLElement, data: SaveData, persist: () => void, totals: [number, number, number]): Promise<void> {
  try {
    await Promise.all([document.fonts.load('400 24px "Courier Prime"'), document.fonts.load('700 24px "Courier Prime"')]);
  } catch {
    // fall back to Courier New
  }
  const el = document.createElement('section');
  el.className = 'cert-screen';
  el.innerHTML = `
    <div class="cert-preview"><canvas role="img" aria-label="Your certificate"></canvas></div>
    <div class="cert-side">
      <p class="eyebrow">1966 · 2018 · 2019</p>
      <h1>Your certificate</h1>
      <p class="cert-lede">Printed on genuine simulated teletype paper. It's made on this device; nothing is uploaded.</p>
      <label class="cert-name">Name on the certificate (optional)
        <input type="text" maxlength="28" spellcheck="false" placeholder="An anonymous prompter" />
      </label>
      <div class="cert-actions">
        <button type="button" class="btn primary cert-dl">Download PNG</button>
        <button type="button" class="btn cert-share" hidden>Share…</button>
      </div>
      <p class="cert-status" role="status"></p>
      <div class="cert-actions">
        <button type="button" class="btn cert-museum">Visit the museum</button>
        <button type="button" class="btn cert-done">Back to the title</button>
      </div>
    </div>`;
  app.appendChild(el);
  const canvas = el.querySelector('canvas')!;
  const input = el.querySelector<HTMLInputElement>('.cert-name input')!;
  const status = el.querySelector<HTMLElement>('.cert-status')!;
  const share = el.querySelector<HTMLButtonElement>('.cert-share')!;
  input.value = data.finale.name;
  const info = certInfo(data, totals);
  const redraw = () => {
    info.name = input.value;
    drawCertificate(canvas, info);
  };
  redraw();
  sfx.tear();
  input.addEventListener('input', () => {
    redraw();
    data.finale.name = input.value;
    persist();
  });

  const toBlob = () => new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('no image'))), 'image/png'));
  const filename = 'mad-models-certificate.png';
  el.querySelector('.cert-dl')!.addEventListener('click', async () => {
    const url = URL.createObjectURL(await toBlob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.textContent = 'Saved as mad-models-certificate.png.';
  });
  const probe = new File([new Blob()], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [probe] })) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      try {
        const file = new File([await toBlob()], filename, { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Mad Models', text: 'I prompted ELIZA, GPT-1 and GPT-2.' });
      } catch {
        // cancelled
      }
    });
  }
  el.querySelector('.cert-museum')!.addEventListener('click', () => {
    void showMuseum(app, data.placards).then(() => el.querySelector<HTMLButtonElement>('.cert-museum')!.focus({ preventScroll: true }));
  });
  el.querySelector<HTMLButtonElement>('.cert-dl')!.focus({ preventScroll: true });
  return new Promise((resolve) => {
    el.querySelector('.cert-done')!.addEventListener('click', () => {
      el.remove();
      resolve();
    });
  });
}
