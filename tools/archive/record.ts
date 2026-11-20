// Record real outputs for Archive Mode from the same converted models the
// game runs, using the same settings and the same 13+ filter.
//
//   node tools/archive/record.ts [samplesPerPrompt=6]
//
// Needs the model files in public/models/*/onnx/ (see tools/models/README.md).
// Writes public/archive/gpt1.json and public/archive/gpt2.json.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import { MODELS, type ModelId } from '../../src/engine/models/models.ts';
import { blockedVariants, findBlocked } from '../../src/engine/models/safety.ts';
import type { ArchiveFile } from '../../src/engine/models/archive.ts';

const root = new URL('../../', import.meta.url);
env.allowRemoteModels = false;
env.localModelPath = new URL('public/models/', root).pathname;

const samples = Number(process.argv[2] ?? 6);
const prompts = JSON.parse(readFileSync(new URL('tools/archive/prompts.json', root), 'utf8')) as Record<
  ModelId,
  { id: string; prompt: string; temperature: number; maxNewTokens: number }[]
>;

for (const id of ['gpt1', 'gpt2'] as ModelId[]) {
  const info = MODELS[id];
  const tokenizer = await AutoTokenizer.from_pretrained(info.path);
  const model = await AutoModelForCausalLM.from_pretrained(info.path, { dtype: 'q8' });
  const bad_words_ids = blockedVariants(info.lowercase).map((w) => tokenizer.encode(w, { add_special_tokens: false }) as number[]);
  const file: ArchiveFile = {
    model: id,
    recorded: new Date().toISOString().slice(0, 10),
    note: `Real outputs from ${info.name} (${info.params} parameters), recorded with the game's own model files and filter.`,
    entries: [],
  };
  for (const p of prompts[id]) {
    const outputs: string[] = [];
    let tries = 0;
    while (outputs.length < samples && tries++ < samples * 4) {
      const inputs = tokenizer(p.prompt);
      const out = await model.generate({
        ...inputs,
        max_new_tokens: p.maxNewTokens,
        do_sample: true,
        temperature: p.temperature,
        top_k: 40,
        bad_words_ids,
      });
      const promptLen = (inputs.input_ids.dims as number[])[1];
      const ids = Array.from((out as { data: BigInt64Array }).data, Number).slice(promptLen);
      let text = tokenizer.decode(ids, { skip_special_tokens: true });
      if (info.lowercase && text && !/^\s/.test(text)) text = ' ' + text; // see worker.ts
      if (findBlocked(text).length === 0 && text.trim()) outputs.push(text);
    }
    file.entries.push({ ...p, outputs });
    console.log(`${id}/${p.id}: ${outputs.length} outputs. e.g. ${JSON.stringify(outputs[0]?.slice(0, 90))}`);
  }
  mkdirSync(new URL('public/archive/', root), { recursive: true });
  writeFileSync(new URL(`public/archive/${id}.json`, root), JSON.stringify(file, null, 1) + '\n');
}
