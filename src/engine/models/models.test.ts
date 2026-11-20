import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ArchiveFile } from './archive';
import { recommend } from './capability';
import { MODELS } from './models';
import { blockedVariants, findBlocked, promptAllowed, redact } from './safety';

describe('13+ filter', () => {
  it('finds blocked words on word boundaries only', () => {
    expect(findBlocked('A careful analysis of the classic text.')).toEqual([]);
    expect(findBlocked('What the FUCK, he said.')).toEqual(['fuck']);
  });

  it('redacts in period style', () => {
    expect(redact('oh fuck no', 'typewriter')).toEqual({ text: 'oh XXXX no', redacted: true });
    expect(redact('oh fuck no', 'sticker').text).toBe('oh [REDACTED BY SAFETY TEAM] no');
    expect(redact('perfectly fine', 'sticker')).toEqual({ text: 'perfectly fine', redacted: false });
  });

  it('lets players write mild romance but not slurs', () => {
    expect(promptAllowed('Edward kissed Bella in the meadow.')).toBe(true);
    expect(promptAllowed('you retard')).toBe(false);
  });

  it('blocks GPT-1 spellings in lowercase only, GPT-2 in several cases', () => {
    expect(blockedVariants(true)).toContain(' fuck');
    expect(blockedVariants(true)).not.toContain('Fuck');
    expect(blockedVariants(false)).toContain(' Fuck');
  });
});

describe('play mode recommendation', () => {
  const base = { webgpu: false, memoryGB: 8, mobile: false, saveData: false };
  it('prefers the graphics card', () => expect(recommend({ ...base, webgpu: true }).recommended).toBe('webgpu'));
  it('falls back to the CPU', () => expect(recommend(base).recommended).toBe('wasm'));
  it('uses the archive on low-memory devices', () => expect(recommend({ ...base, memoryGB: 2 }).recommended).toBe('archive'));
  it('respects save-data', () => expect(recommend({ ...base, webgpu: true, saveData: true }).recommended).toBe('archive'));
  it('uses the archive on phones without WebGPU', () => expect(recommend({ ...base, mobile: true }).recommended).toBe('archive'));
});

describe('recorded archive', () => {
  for (const id of ['gpt1', 'gpt2'] as const) {
    it(`${id} has clean recordings for every prompt`, () => {
      const file = JSON.parse(readFileSync(new URL(`../../../public/archive/${id}.json`, import.meta.url), 'utf8')) as ArchiveFile;
      expect(file.model).toBe(id);
      expect(file.entries.length).toBeGreaterThan(0);
      for (const e of file.entries) {
        expect(e.outputs.length, e.id).toBeGreaterThan(0);
        for (const o of e.outputs) expect(findBlocked(o), `${e.id}: ${o}`).toEqual([]);
      }
    });
  }
});

describe('model registry', () => {
  it('matches the shipped model files', () => {
    for (const m of Object.values(MODELS)) {
      const cfg = JSON.parse(readFileSync(new URL(`../../../public/models/${m.path}/config.json`, import.meta.url), 'utf8'));
      expect(cfg.model_type).toBe('gpt2'); // GPT-1 is exported with a GPT-2-compatible interface
      expect(cfg.n_positions ?? cfg.n_ctx).toBe(m.context);
    }
  });
});
