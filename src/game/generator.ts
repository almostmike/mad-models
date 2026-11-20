// One place the GPT levels ask for text, whether the model runs live on
// this device or plays back real recordings (Archive Mode).

import { ArchivePlayer, type ArchiveEntry } from '../engine/models/archive';
import { detectCapability, type Capability, type PlayMode } from '../engine/models/capability';
import { ModelClient, type Generation, type LoadProgress } from '../engine/models/client';
import type { GenerateOptions, ModelId } from '../engine/models/models';

export interface RunRequest {
  model: ModelId;
  prompt: string;
  options: Partial<GenerateOptions> & { temperature: number };
  /** Archive Mode: the recorded prompt card to play. */
  cardId?: string;
}

export interface Run {
  /** Stop early, keeping what was produced. */
  stop: () => void;
  result: Promise<Generation>;
}

class Generator {
  private client: ModelClient | null = null;
  readonly archive = new ArchivePlayer();
  private capability: Promise<Capability> | null = null;
  mode: PlayMode | null = null;

  detect(): Promise<Capability> {
    this.capability ??= detectCapability();
    return this.capability;
  }

  setMode(mode: PlayMode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode !== 'archive') this.client = new ModelClient(mode);
  }

  get live(): boolean {
    return this.mode === 'webgpu' || this.mode === 'wasm';
  }

  /** Start downloading a model in the background (no-op in Archive Mode). */
  prefetch(model: ModelId, onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (!this.live || !this.client) return this.archive.load(model).then(() => undefined);
    return this.client.load(model, onProgress).then(() => undefined);
  }

  cards(model: ModelId): Promise<ArchiveEntry[]> {
    return this.archive.entries(model);
  }

  run(req: RunRequest, onToken: (chunk: string) => void): Run {
    if (this.live && this.client) {
      const c = this.client;
      const { id, result } = c.generate(req.model, req.prompt, req.options, onToken);
      return { stop: () => c.abort(id), result };
    }
    const abort = new AbortController();
    const result = (async () => {
      if (!req.cardId) throw new Error('Archive Mode needs a prompt card');
      const text = await this.archive.pick(req.model, req.cardId);
      return this.archive.replay(text, onToken, abort.signal);
    })();
    return { stop: () => abort.abort(), result };
  }
}

export const generator = new Generator();
