// The real models the game runs, converted by tools/models/ (see README there).

export type ModelId = 'gpt1' | 'gpt2';

export interface ModelInfo {
  id: ModelId;
  /** Folder under <site>/models/ holding config, tokenizer and onnx/. */
  path: string;
  name: string;
  released: string;
  params: string;
  /** Size of onnx/model_quantized.onnx, for honest download estimates. */
  bytes: number;
  /** Maximum tokens the model can see at once (prompt + output). */
  context: number;
  /** GPT-1's tokenizer lowercases everything and splits punctuation. */
  lowercase: boolean;
  trainedOn: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  gpt1: {
    id: 'gpt1',
    path: 'openai-gpt',
    name: 'GPT-1',
    released: 'June 2018',
    params: '117 million',
    bytes: 117_347_683,
    context: 512,
    lowercase: true,
    trainedOn: 'BookCorpus: about 7,000 self-published books',
  },
  gpt2: {
    id: 'gpt2',
    path: 'gpt2',
    name: 'GPT-2 (small)',
    released: 'February 2019',
    params: '124 million',
    bytes: 128_196_296,
    context: 1024,
    lowercase: false,
    trainedOn: 'WebText: about 8 million web pages linked from Reddit',
  },
};

export interface GenerateOptions {
  maxNewTokens: number;
  temperature: number;
  topK: number;
  /** Sample (true) or always take the likeliest token (false). */
  sample: boolean;
  /** Words the model may not produce (13+ filter). */
  blockWords: boolean;
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  maxNewTokens: 60,
  temperature: 0.8,
  topK: 40,
  sample: true,
  blockWords: true,
};

/** Messages from the page to the worker. */
export type WorkerRequest =
  | { type: 'load'; model: ModelId; device: 'webgpu' | 'wasm'; base: string; siteOnly?: boolean }
  | { type: 'generate'; id: number; model: ModelId; prompt: string; options: GenerateOptions }
  | { type: 'abort'; id: number }
  | { type: 'count'; id: number; model: ModelId; text: string };

/** Messages from the worker to the page. */
export type WorkerResponse =
  | { type: 'progress'; model: ModelId; loaded: number; total: number }
  | { type: 'ready'; model: ModelId; device: 'webgpu' | 'wasm'; source: 'hub' | 'site'; ms: number }
  | { type: 'load-error'; model: ModelId; message: string }
  | { type: 'token'; id: number; text: string }
  | { type: 'done'; id: number; text: string; tokens: number; ms: number; truncated: boolean }
  | { type: 'count-result'; id: number; tokens: number }
  | { type: 'error'; id: number; message: string };
