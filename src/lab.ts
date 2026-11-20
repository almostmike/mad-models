// Dev-only Model Lab: drives the real worker, client, filter and archive.

import { ArchivePlayer } from './engine/models/archive';
import { detectCapability, type PlayMode } from './engine/models/capability';
import { ModelClient } from './engine/models/client';
import type { ModelId } from './engine/models/models';
import { redact } from './engine/models/safety';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $<HTMLParagraphElement>('status');
const out = $<HTMLDivElement>('out');
const stats = $<HTMLParagraphElement>('stats');
const prog = $<HTMLProgressElement>('prog');
const modelSel = $<HTMLSelectElement>('model');
const modeSel = $<HTMLSelectElement>('mode');
const card = $<HTMLSelectElement>('card');
const archive = new ArchivePlayer();
const clients: Partial<Record<'webgpu' | 'wasm', ModelClient>> = {};
let current: { id: number; client: ModelClient } | null = null;
let abort: AbortController | null = null;

const cap = await detectCapability();
modeSel.value = cap.recommended;
status.textContent = `WebGPU: ${cap.webgpu}. Memory: ${cap.memoryGB ?? '?'} GB. Recommended: ${cap.recommended} (${cap.reason})`;
$<HTMLInputElement>('temp').oninput = (e) => ($('tempv').textContent = (e.target as HTMLInputElement).value);

const mode = () => modeSel.value as PlayMode;
const model = () => modelSel.value as ModelId;
// ?source=site skips Hugging Face, to test the fallback copy on this site.
const siteOnly = new URLSearchParams(location.search).get('source') === 'site';
const client = () => (clients[mode() as 'webgpu' | 'wasm'] ??= new ModelClient(mode() as 'webgpu' | 'wasm', { siteOnly }));

async function refreshCards() {
  card.hidden = mode() !== 'archive';
  if (card.hidden) return;
  const entries = await archive.entries(model());
  card.innerHTML = entries.map((e) => `<option value="${e.id}">${e.id}</option>`).join('');
  const first = entries[0];
  if (first) $<HTMLTextAreaElement>('prompt').value = first.prompt;
}
card.onchange = async () => {
  const e = (await archive.entries(model())).find((x) => x.id === card.value);
  if (e) $<HTMLTextAreaElement>('prompt').value = e.prompt;
};
modeSel.onchange = modelSel.onchange = () => void refreshCards();

$('load').onclick = async () => {
  if (mode() === 'archive') {
    await refreshCards();
    status.textContent = 'Archive loaded.';
    return;
  }
  const t0 = performance.now();
  status.textContent = `Loading ${model()}…`;
  try {
    const device = await client().load(model(), (p) => {
      prog.max = p.total;
      prog.value = p.loaded;
    });
    status.textContent = `${model()} ready on ${device} from ${client().sources.get(model()) === 'hub' ? 'Hugging Face' : 'this site'} in ${((performance.now() - t0) / 1000).toFixed(1)}s`;
    (window as unknown as { __lab: unknown }).__lab = { ready: true, device };
  } catch (e) {
    status.textContent = `Load failed: ${(e as Error).message}`;
  }
};

$('go').onclick = async () => {
  const prompt = $<HTMLTextAreaElement>('prompt').value;
  out.innerHTML = '';
  out.append(prompt);
  const gen = document.createElement('span');
  gen.className = 'gen';
  out.append(gen);
  const onToken = (c: string) => (gen.textContent += c);
  let result;
  if (mode() === 'archive') {
    abort = new AbortController();
    result = await archive.replay(await archive.pick(model(), card.value), onToken, abort.signal);
  } else {
    const c = client();
    const { id, result: r } = c.generate(
      model(),
      prompt,
      {
        temperature: Number($<HTMLInputElement>('temp').value),
        maxNewTokens: Number($<HTMLInputElement>('len').value),
        sample: $<HTMLInputElement>('sample').checked,
      },
      onToken,
    );
    current = { id, client: c };
    try {
      result = await r;
    } catch (e) {
      stats.textContent = `Error: ${(e as Error).message}`;
      current = null;
      return;
    }
    current = null;
  }
  const { text, redacted } = redact(result.text, 'sticker');
  gen.textContent = text;
  stats.textContent = `${result.tokens} tokens in ${(result.ms / 1000).toFixed(1)}s (${(result.tokens / (result.ms / 1000)).toFixed(1)}/s)${result.truncated ? ' · prompt trimmed to fit' : ''}${redacted ? ' · redacted' : ''}`;
  (window as unknown as { __labResult: unknown }).__labResult = { ...result, redacted };
};

$('stop').onclick = () => {
  if (current) current.client.abort(current.id);
  abort?.abort();
};
