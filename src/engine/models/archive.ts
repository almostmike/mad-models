// Archive Mode: real outputs recorded in advance from the same converted
// models (tools/archive/record.ts), replayed for devices that can't run the
// models live. The game says so on screen; nothing here is invented.

import type { Generation } from './client';
import type { ModelId } from './models';

export interface ArchiveEntry {
  /** Stable id the game's prompt cards refer to. */
  id: string;
  prompt: string;
  temperature: number;
  maxNewTokens: number;
  outputs: string[];
}

export interface ArchiveFile {
  model: ModelId;
  recorded: string;
  note: string;
  entries: ArchiveEntry[];
}

/** Tokens per second used to replay recorded text, so it streams like the real thing. */
const REPLAY_TPS = 14;

export class ArchivePlayer {
  private readonly files = new Map<ModelId, Promise<ArchiveFile>>();
  private readonly used = new Map<string, number>();

  load(model: ModelId): Promise<ArchiveFile> {
    let f = this.files.get(model);
    if (!f) {
      f = fetch(`${import.meta.env.BASE_URL}archive/${model}.json`).then((r) => {
        if (!r.ok) throw new Error(`No archive for ${model}`);
        return r.json() as Promise<ArchiveFile>;
      });
      this.files.set(model, f);
    }
    return f;
  }

  async entries(model: ModelId): Promise<ArchiveEntry[]> {
    return (await this.load(model)).entries;
  }

  /** Next recorded output for a prompt card, cycling so re-rolls differ. */
  async pick(model: ModelId, id: string): Promise<string> {
    const entry = (await this.entries(model)).find((e) => e.id === id);
    if (!entry || entry.outputs.length === 0) throw new Error(`No recording for ${id}`);
    const key = `${model}:${id}`;
    const n = this.used.get(key) ?? 0;
    this.used.set(key, n + 1);
    return entry.outputs[n % entry.outputs.length];
  }

  /** Replay a recording with the same streaming shape as live generation. */
  replay(text: string, onToken?: (chunk: string) => void, signal?: AbortSignal): Promise<Generation> {
    const chunks = text.match(/\s*\S+/g) ?? [];
    const started = performance.now();
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (signal?.aborted || i >= chunks.length) {
          resolve({ text: chunks.slice(0, i).join(''), tokens: i, ms: performance.now() - started, truncated: false });
          return;
        }
        onToken?.(chunks[i++]);
        setTimeout(step, 1000 / REPLAY_TPS);
      };
      step();
    });
  }
}
