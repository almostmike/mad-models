# Model files

The game runs OpenAI's real GPT-1 (2018) and GPT-2 (2019) in the browser with
[Transformers.js](https://github.com/huggingface/transformers.js). These
scripts produce the two browser-ready files. They are hosted in two places:

- **Primary:** the Hugging Face repo [`almostmike/mad-models`](https://huggingface.co/almostmike/mad-models)
  (free CDN, no bandwidth limit), pinned in `src/engine/models/worker.ts` to commit
  `94fd3b252f6ed0ef8ceac67b7321fa7f32a4e1aa`.
- **Fallback:** the [`models-v1` release](https://github.com/almostmike/mad-models/releases/tag/models-v1),
  copied into the site at `models/<name>/onnx/model_quantized.onnx` by the deploy workflow.
  The worker uses it automatically if Hugging Face fails. Test it with `lab.html?source=site`.

Configs and tokenizers live in `public/models/` in git, and in the Hugging Face repo.

| Model | Source weights | Download | Next-token agreement with full precision |
|---|---|---|---|
| GPT-1 | `openai-community/openai-gpt` (safetensors) | 117 MB | 96% |
| GPT-2 small | `Xenova/gpt2` `onnx/model.onnx` (full precision) | 128 MB | 95% |

Both are MIT-licensed weights from OpenAI.

## Why custom files

- **GPT-1** has no browser-ready version, and Transformers.js doesn't support its
  architecture. `convert_gpt1.py` rebuilds it in PyTorch (post-LayerNorm blocks,
  tanh GELU, tied output head, one stored embedding table) and exports ONNX with a
  key/value cache and GPT-2's input/output names. `config.json` says `gpt2`, so
  Transformers.js runs it with `GPT2LMHeadModel`.
- **Both models** use `quantize_weights.py`: 8-bit weights with one scale per
  output channel, expanded to float32 at load time, so activations are never
  quantized. Embedding tables get one scale per *dimension*. GPT-2 has a few
  "rogue" dimensions with huge values, and per-word scales cost it 20 points of
  accuracy. The standard dynamic 8-bit exports agree with full precision only
  70–76% of the time.

## Rebuild

```bash
python3 -m venv .venv && .venv/bin/pip install torch onnx onnxruntime safetensors numpy "transformers<4.57"
```

```bash
# GPT-1: download config.json, tokenizer.json, vocab.json, merges.txt, model.safetensors
# from huggingface.co/openai-community/openai-gpt into ./gpt1-src, then:
.venv/bin/python convert_gpt1.py gpt1-src gpt1-onnx
.venv/bin/python verify_gpt1.py gpt1-src gpt1-onnx/onnx/model.onnx      # must print "identical: True"
.venv/bin/python quantize_weights.py gpt1-onnx/onnx/model.onnx gpt1-onnx/onnx/model_quantized.onnx
.venv/bin/python compare_gpt1.py gpt1-src/tokenizer.json gpt1-onnx/onnx/model.onnx gpt1-onnx/onnx/model_quantized.onnx
```

```bash
# GPT-2: download tokenizer.json and onnx/model.onnx from huggingface.co/Xenova/gpt2 into ./gpt2-src, then:
.venv/bin/python quantize_weights.py gpt2-src/onnx/model.onnx gpt2-src/onnx/model_quantized.onnx
.venv/bin/python compare_gpt2.py gpt2-src/tokenizer.json gpt2-src/onnx/model.onnx gpt2-src/onnx/model_quantized.onnx
```

For local development, put the two files at
`public/models/openai-gpt/onnx/model_quantized.onnx` and
`public/models/gpt2/onnx/model_quantized.onnx` (gitignored).

## Archive Mode

`tools/archive/record.ts` records real outputs from these same files, with the
same 13+ filter, for devices that can't run the models live:

```bash
node tools/archive/record.ts 6
```

## Runtime notes

- Transformers.js 4.3 skips its local file check when `env.localModelPath` is a
  full URL, so the client passes a site-relative path.
- On the CPU (WASM) path the worker can't read a stop message mid-generation,
  so `ModelClient.abort` restarts the worker after 300 ms. The models reload
  from the browser cache in about a second.
- ONNX Runtime's WebAssembly files load from the jsDelivr CDN (the Transformers.js
  default). They can be self-hosted later if needed.
