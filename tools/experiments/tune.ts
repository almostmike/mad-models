// Tune Level 2/3 objectives against the real models: run each prompt
// setting N times and report how often the candidate detector fires.
//   node tools/experiments/tune.ts [N=10] [gpt1|gpt2]

import { AutoModelForCausalLM, AutoTokenizer, env } from '@huggingface/transformers';
import { MODELS, type ModelId } from '../../src/engine/models/models.ts';
import { blockedVariants } from '../../src/engine/models/safety.ts';
import * as M from '../../src/engine/metrics.ts';

const root = new URL('../../', import.meta.url);
env.allowRemoteModels = false;
env.localModelPath = new URL('public/models/', root).pathname;
const N = Number(process.argv[2] ?? 10);
const only = process.argv[3];

const OCEAN = ['sea', 'ocean', 'wave*', 'ship*', 'salt', 'tide*', 'shore', 'sail*', 'water', 'beach', 'boat*', 'deck', 'horizon', 'spray', 'gull*', 'harbor', 'fish*', 'storm*'];
const ROMANCE = ['kiss*', 'lips', 'heart', 'love*', 'whisper*', 'eyes', 'touch*', 'embrace*', 'darling', 'breath*', 'cheek*', 'blush*'];
const TWILIGHT = ['vampire*', 'bella', 'edward', 'pale', 'cold', 'eyes', 'forks', 'blood', 'skin', 'sparkl*', 'golden', 'jacob', 'wolf', 'werewol*', 'rain', 'meadow', 'heart', 'kiss*', 'dangerous', 'stare*', 'smell*', 'teeth', 'sun*', 'diamond*', 'glitter*', 'shimmer*'];

type Case = { name: string; prompt: string; temp: number; tokens?: number; topK?: number; test: (out: string, prompt: string) => boolean; show?: boolean; dist?: (out: string) => number };

const cases: Record<ModelId, Case[]> = {
  gpt1: [
    { name: 'chapters', prompt: 'chapter one\nchapter two\nchapter', temp: 0.7, tokens: 15, test: (o) => /^\s*three\b/i.test(o), show: true },
    { name: 'chapters inline', prompt: 'chapter one . chapter two . chapter three . chapter', temp: 0.7, tokens: 15, test: (o) => /^\s*four\b/i.test(o), show: true },
    { name: 'counting', prompt: 'one, two, three, four, five,', temp: 0.7, tokens: 15, test: (o) => /^\s*six\b/i.test(o), show: true },
    { name: 'capitals', prompt: 'the capital of france is paris. the capital of italy is rome. the capital of spain is', temp: 0.7, tokens: 10, test: (o) => /madrid/i.test(o), show: true },
    { name: 'opposites', prompt: 'hot and cold. up and down. black and white. big and', temp: 0.7, tokens: 10, test: (o) => /^\s*(small|little)\b/i.test(o), show: true },
    { name: 'months', prompt: 'january, february, march, april,', temp: 0.7, tokens: 15, test: (o) => /^\s*may\b/i.test(o), show: true },
  ],
  gpt2: [],
};

for (const id of (only ? [only] : ['gpt1', 'gpt2']) as ModelId[]) {
  const info = MODELS[id];
  const tok = await AutoTokenizer.from_pretrained(info.path);
  const model = await AutoModelForCausalLM.from_pretrained(info.path, { dtype: 'q8' });
  const bad = blockedVariants(info.lowercase).map((w) => tok.encode(w, { add_special_tokens: false }) as number[]);
  for (const c of cases[id]) {
    let hits = 0;
    let sample = '';
    const dist: number[] = [];
    for (let i = 0; i < N; i++) {
      const inputs = tok(c.prompt);
      const out = await model.generate({ ...inputs, max_new_tokens: c.tokens ?? 60, do_sample: true, temperature: c.temp, top_k: c.topK ?? 40, bad_words_ids: bad });
      const n = (inputs.input_ids.dims as number[])[1];
      const text = tok.decode(Array.from((out as { data: BigInt64Array }).data, Number).slice(n), { skip_special_tokens: true });
      if (c.test(text, c.prompt)) hits++;
      if (c.dist) dist.push(c.dist(text));
      if (!sample) sample = text;
    }
    console.log(`${id} | ${c.name.padEnd(22)} | ${hits}/${N}${dist.length ? ` | dist ${dist.sort((a, b) => a - b).join(',')}` : ''}${c.show ? ` | e.g. ${JSON.stringify(sample.slice(0, 140))}` : ''}`);
  }
}
