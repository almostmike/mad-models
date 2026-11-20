// Page-side handle on the model worker.

import { DEFAULT_OPTIONS, MODELS, type GenerateOptions, type ModelId, type WorkerRequest, type WorkerResponse } from './models';

export interface LoadProgress {
  loaded: number;
  total: number;
}

export interface Generation {
  text: string;
  tokens: number;
  ms: number;
  truncated: boolean;
}

type Pending = {
  resolve: (v: Generation) => void;
  reject: (e: Error) => void;
  onToken?: (chunk: string) => void;
  text: string;
  tokens: number;
  started: number;
};

/** How long a stop request may take before the worker is restarted. */
const ABORT_GRACE_MS = 300;

export class ModelClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly counts = new Map<number, (n: number) => void>();
  private readonly loads = new Map<ModelId, Promise<'webgpu' | 'wasm'>>();
  private readonly progress = new Map<ModelId, Set<(p: LoadProgress) => void>>();
  private readonly loadWaiters = new Map<ModelId, { resolve: (d: 'webgpu' | 'wasm') => void; reject: (e: Error) => void }>();
  readonly device: 'webgpu' | 'wasm';
  /** Where each loaded model came from: Hugging Face, or this site's fallback copy. */
  readonly sources = new Map<ModelId, 'hub' | 'site'>();

  /** Skip Hugging Face and use this site's copy (testing the fallback). */
  private readonly siteOnly: boolean;

  constructor(device: 'webgpu' | 'wasm', opts: { siteOnly?: boolean } = {}) {
    this.device = device;
    this.siteOnly = !!opts.siteOnly;
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.receive(e.data);
    }
    return this.worker;
  }

  private send(msg: WorkerRequest) {
    this.getWorker().postMessage(msg);
  }

  private receive(msg: WorkerResponse) {
    switch (msg.type) {
      case 'progress':
        this.progress.get(msg.model)?.forEach((cb) => cb({ loaded: msg.loaded, total: msg.total }));
        break;
      case 'ready':
        this.sources.set(msg.model, msg.source);
        this.loadWaiters.get(msg.model)?.resolve(msg.device);
        this.loadWaiters.delete(msg.model);
        break;
      case 'load-error':
        this.loadWaiters.get(msg.model)?.reject(new Error(msg.message));
        this.loadWaiters.delete(msg.model);
        this.loads.delete(msg.model);
        break;
      case 'token': {
        const p = this.pending.get(msg.id);
        if (p) {
          p.text += msg.text;
          p.tokens++;
          p.onToken?.(msg.text);
        }
        break;
      }
      case 'done': {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.resolve({ text: msg.text, tokens: msg.tokens, ms: msg.ms, truncated: msg.truncated });
        break;
      }
      case 'error': {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.reject(new Error(msg.message));
        break;
      }
      case 'count-result':
        this.counts.get(msg.id)?.(msg.tokens);
        this.counts.delete(msg.id);
        break;
    }
  }

  /** Download (or read from the browser cache) and initialise a model. Safe to call repeatedly. */
  load(model: ModelId, onProgress?: (p: LoadProgress) => void): Promise<'webgpu' | 'wasm'> {
    if (onProgress) {
      if (!this.progress.has(model)) this.progress.set(model, new Set());
      this.progress.get(model)!.add(onProgress);
    }
    let p = this.loads.get(model);
    if (!p) {
      p = new Promise((resolve, reject) => this.loadWaiters.set(model, { resolve, reject }));
      this.loads.set(model, p);
      // A site-relative path, not a full URL: Transformers.js 4.3 skips its
      // local "does this file exist" check for full URLs and then fails.
      const base = new URL(`${import.meta.env.BASE_URL}models/`, location.href).pathname;
      this.send({ type: 'load', model, device: this.device, base, siteOnly: this.siteOnly });
    }
    return p;
  }

  isLoading(model: ModelId): boolean {
    return this.loads.has(model);
  }

  /** Generate a continuation, streaming chunks to onToken. */
  generate(model: ModelId, prompt: string, options: Partial<GenerateOptions> = {}, onToken?: (chunk: string) => void): { id: number; result: Promise<Generation> } {
    const id = this.nextId++;
    const result = new Promise<Generation>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onToken, text: '', tokens: 0, started: performance.now() });
    });
    // Load first (instant if already loaded; reloads after a restart).
    this.load(model).then(
      () => {
        if (this.pending.has(id)) this.send({ type: 'generate', id, model, prompt, options: { ...DEFAULT_OPTIONS, ...options } });
      },
      (e: Error) => {
        const p = this.pending.get(id);
        this.pending.delete(id);
        p?.reject(e);
      },
    );
    return { id, result };
  }

  /**
   * Stop a generation, keeping what was produced so far. On the CPU (WASM)
   * path the worker is too busy to read the stop message until it finishes,
   * so if it hasn't stopped within a moment we restart it; the models reload
   * from the browser cache in about a second on next use.
   */
  abort(id: number): void {
    if (!this.pending.has(id)) return;
    this.send({ type: 'abort', id });
    setTimeout(() => {
      const p = this.pending.get(id);
      if (!p) return;
      this.restart();
      p.resolve({ text: p.text, tokens: p.tokens, ms: performance.now() - p.started, truncated: false });
    }, ABORT_GRACE_MS);
  }

  private restart(): void {
    this.worker?.terminate();
    this.worker = null;
    this.loads.clear();
    for (const [, w] of this.loadWaiters) w.reject(new Error('restarted'));
    this.loadWaiters.clear();
    for (const [id, p] of this.pending) {
      p.resolve({ text: p.text, tokens: p.tokens, ms: performance.now() - p.started, truncated: false });
      this.pending.delete(id);
    }
  }

  /** Token count of a text, for the context meter. */
  count(model: ModelId, text: string): Promise<number> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.counts.set(id, resolve);
      this.send({ type: 'count', id, model, text });
    });
  }

  static sizeLabel(model: ModelId): string {
    return `${Math.round(MODELS[model].bytes / 1e6)} MB`;
  }
}
