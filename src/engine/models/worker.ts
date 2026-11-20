// Runs the real models off the main thread with Transformers.js.
// Weights come from the Hugging Face repo almostmike/mad-models (free CDN),
// pinned to one commit, with this site's own /models/ folder as a fallback.
// Both hold the same files (see tools/models/).

import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  StoppingCriteriaList,
  Tensor,
  TextStreamer,
  env,
  type PreTrainedModel,
  type PreTrainedTokenizer,
} from '@huggingface/transformers';
import { MODELS, type GenerateOptions, type ModelId, type WorkerRequest, type WorkerResponse } from './models';
import { blockedVariants } from './safety';

env.useBrowserCache = true;

const HF_REPO = 'almostmike/mad-models';
/** Pinned upload commit: the files can never change under the game. */
const HF_REVISION = '94fd3b252f6ed0ef8ceac67b7321fa7f32a4e1aa';

type Source = 'hub' | 'site';

function useSource(source: Source, base: string): string | undefined {
  if (source === 'hub') {
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    env.remoteHost = 'https://huggingface.co/';
    env.remotePathTemplate = `${HF_REPO}/resolve/{revision}/{model}/`;
    return HF_REVISION;
  }
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = base;
  return undefined;
}

interface Loaded {
  tokenizer: PreTrainedTokenizer;
  model: PreTrainedModel;
  badWordsIds: number[][];
  device: 'webgpu' | 'wasm';
  source: Source;
}

const loaded = new Map<ModelId, Promise<Loaded>>();
const stoppers = new Map<number, InterruptableStoppingCriteria>();

const post = (msg: WorkerResponse) => self.postMessage(msg);

/** `env` is global, so loads run one at a time. */
let queue: Promise<unknown> = Promise.resolve();

function load(id: ModelId, device: 'webgpu' | 'wasm', base: string, siteOnly = false): Promise<Loaded> {
  const run = async () => {
    if (siteOnly) return loadFrom('site', id, device, base);
    try {
      return await loadFrom('hub', id, device, base);
    } catch (e) {
      console.warn(`Hugging Face load failed for ${id}, using this site's copy`, e);
      return await loadFrom('site', id, device, base);
    }
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

async function loadFrom(source: Source, id: ModelId, device: 'webgpu' | 'wasm', base: string): Promise<Loaded> {
  const revision = useSource(source, base);
  const info = MODELS[id];
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== 'progress' || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    let l = 0;
    let t = 0;
    for (const f of files.values()) {
      l += f.loaded;
      t += f.total;
    }
    post({ type: 'progress', model: id, loaded: l, total: Math.max(t, info.bytes) });
  };
  const tokenizer = await AutoTokenizer.from_pretrained(info.path, { progress_callback, revision });
  let model: PreTrainedModel;
  try {
    model = await AutoModelForCausalLM.from_pretrained(info.path, { dtype: 'q8', device, progress_callback, revision });
  } catch (e) {
    if (device !== 'webgpu') throw e;
    device = 'wasm'; // WebGPU can fail on some machines; the CPU path always works
    model = await AutoModelForCausalLM.from_pretrained(info.path, { dtype: 'q8', device: 'wasm', progress_callback, revision });
  }
  const badWordsIds = blockedVariants(info.lowercase)
    .map((w) => tokenizer.encode(w, { add_special_tokens: false }) as number[])
    .filter((ids) => ids.length > 0);
  return { tokenizer, model, badWordsIds, device, source };
}

async function generate(id: number, modelId: ModelId, prompt: string, o: GenerateOptions) {
  const started = performance.now();
  const m = await loaded.get(modelId);
  if (!m) throw new Error(`${modelId} is not loaded`);
  const info = MODELS[modelId];

  // Keep prompt + output inside the model's context window: drop the oldest tokens.
  let ids = m.tokenizer.encode(prompt) as number[];
  const room = info.context - o.maxNewTokens;
  const truncated = ids.length > room;
  if (truncated) ids = ids.slice(ids.length - room);
  const input_ids = new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
  const attention_mask = new Tensor('int64', new BigInt64Array(ids.length).fill(1n), [1, ids.length]);

  const stopper = new InterruptableStoppingCriteria();
  stoppers.set(id, stopper);
  const stopping_criteria = new StoppingCriteriaList();
  stopping_criteria.push(stopper);
  let tokens = 0;
  let text = '';
  const streamer = new TextStreamer(m.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (chunk: string) => {
      // GPT-1's decoder joins words with spaces but drops the first one,
      // which would glue the continuation onto the prompt ("spraystung").
      if (info.lowercase && text === '' && chunk && !/^\s/.test(chunk)) chunk = ' ' + chunk;
      text += chunk;
      post({ type: 'token', id, text: chunk });
    },
    token_callback_function: () => {
      tokens++;
    },
  });

  await m.model.generate({
    input_ids,
    attention_mask,
    max_new_tokens: o.maxNewTokens,
    do_sample: o.sample,
    temperature: o.temperature,
    top_k: o.topK,
    bad_words_ids: o.blockWords ? m.badWordsIds : undefined,
    streamer,
    stopping_criteria,
  });
  stoppers.delete(id);
  post({ type: 'done', id, text, tokens, ms: performance.now() - started, truncated });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'load': {
      const started = performance.now();
      if (!loaded.has(msg.model)) loaded.set(msg.model, load(msg.model, msg.device, msg.base, msg.siteOnly));
      try {
        const m = await loaded.get(msg.model)!;
        post({ type: 'ready', model: msg.model, device: m.device, source: m.source, ms: performance.now() - started });
      } catch (err) {
        loaded.delete(msg.model);
        post({ type: 'load-error', model: msg.model, message: String((err as Error)?.message ?? err) });
      }
      break;
    }
    case 'generate':
      try {
        await generate(msg.id, msg.model, msg.prompt, msg.options);
      } catch (err) {
        stoppers.delete(msg.id);
        post({ type: 'error', id: msg.id, message: String((err as Error)?.message ?? err) });
      }
      break;
    case 'abort':
      stoppers.get(msg.id)?.interrupt();
      break;
    case 'count': {
      const m = await loaded.get(msg.model);
      const tokens = m ? (m.tokenizer.encode(msg.text) as number[]).length : 0;
      post({ type: 'count-result', id: msg.id, tokens });
      break;
    }
  }
};
