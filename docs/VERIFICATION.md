# Milestone 0: Verification log

Checked 2026-11-20. Each item resolves a ⚠️ from the PRD.

## Models

| Item | Finding | Decision |
|---|---|---|
| **GPT-2 small (124M)** | `Xenova/gpt2` has browser-ready ONNX files. `decoder_model_merged_quantized.onnx` is **128MB** (int8); `model_fp16.onnx` is 251MB. Transformers.js 4.3.2 maps `gpt2` to `GPT2LMHeadModel`. Weights are MIT-licensed (`openai-community/gpt2`). | ✅ Use as planned. int8 for WASM, try fp16 on WebGPU. |
| **GPT-2 medium (355M)** | `onnx-community/gpt2-medium-ONNX` exists. The smallest file is **562MB** (int8/uint8); fp16 is 710MB. Its q4 files are the same size as fp32, so they aren't actually smaller. | ⚠️ Keep "Full Release" as an opt-in for WebGPU desktops only, with a clear size warning. Never prefetch it. |
| **GPT-1 (117M)** | `openai-community/openai-gpt` is MIT-licensed and has `model.safetensors` and `tokenizer.json`. **No ONNX or browser-ready conversion exists** on Hugging Face. **Transformers.js 4.3.2 has no `openai-gpt` architecture.** GPT-1 uses post-LayerNorm blocks, so its weights can't be loaded into the GPT-2 class as-is. | **Biggest technical risk.** M3 starts with a GPT-1 spike (below). |
| **Generation-time word blocking** | Transformers.js 4.3.2 includes `bad_words_ids` support. | ✅ Use it, plus the post-filter. Behavior to be tested in M3. |

### GPT-1 spike plan (start of M3)

1. **Preferred: custom ONNX export.**
   - Write a small PyTorch module that loads GPT-1's weights and adds a KV cache.
   - Give it the same ONNX inputs and outputs as GPT-2 (`input_ids`, `attention_mask`, `position_ids`, `past_key_values.*` → `logits`, `present.*`), then quantize to int8 (an estimated ~120MB).
   - Host it on a free Hugging Face repo and load it through Transformers.js's GPT-2 class.
   - Also check that Transformers.js handles GPT-1's tokenizer (lowercasing, BERT-style pre-tokenizer, BPE with `</w>`). If it doesn't, write a small custom tokenizer.
2. **Fallback: hand-written inference.** GPT-1 is small (12 layers, 768 wide, 512 context). A plain TypeScript or WebGPU forward pass with a KV cache is a few hundred lines.
3. **Last resort:** GPT-1 runs in Archive Mode only, using real outputs recorded offline with Python.

## ELIZA

| Item | Finding | Decision |
|---|---|---|
| **Original source** | Weizenbaum's MAD-SLIP listing (with the DOCTOR script) was found in the MIT archives. The estate released it under **CC0** (ELIZAGEN; scan on archive.org). | ✅ Free to port. |
| **Reference implementation** | `anthay/ELIZA` (Anthony Hay, C++) is licensed **CC0-1.0** and reproduces the 1966 CACM conversation exactly. | ✅ Use as the behavior reference for our port and tests. |
| **CTSS reanimation** | `rupertl/eliza-ctss` runs the original on an emulated CTSS. No license is listed on the repo. | Reference only. Don't copy its code. |
| **Script version** | The DOCTOR script in the recovered listing differs a little from the one published in the 1966 paper. | Ship the **1966 CACM** script by default, because our acceptance test is the paper's conversation. |

## Terminal

| Item | Finding | Decision |
|---|---|---|
| **Speed** | IBM 2741: about **14.1 characters per second** (134.5 bit/s), Selectric mechanism, half duplex. | ✅ Use 14.1 cps (already in `src/printer.ts`). |
| **Two-color ribbon** | Red-ribbon printing was an optional add-on (a "Ribbon Control RPQ") that needed a hardware modification. It was not standard. | **Black ink only.** ELIZA's replies are set apart by UPPERCASE, as in the 1966 paper. |
| **CTSS + 2741** | MIT documented attaching 2741 consoles to CTSS in 1967 (Programming Staff Note 69). | ✅ A period-plausible choice. ⚠️ ELIZA's earliest sessions may have used other CTSS terminals (IBM 1050, Teletype). That doesn't change the game. |

## Music

| Item | Finding | Decision |
|---|---|---|
| **Udio** | Downloads were disabled on 2025-10-29 after the UMG settlement. Output is personal and non-commercial on every plan. | **Drop Udio.** |
| **Suno** | The free tier is personal, non-commercial use, with Suno owning the output and only a few trial downloads. Paid plans (Pro/Premier) give commercial rights to songs downloaded while subscribed. | ⚠️ Publishing tracks in a public game is likely beyond "personal use." **Generate the tracks on a paid plan** (one month of Pro is enough for about 6 cues), or use CC0/CC-BY music instead. The project owner decides. Confirm against Suno's own terms before M5; these findings come from secondary sources. |

## Hosting

| Item | Finding |
|---|---|
| GitHub Pages | Deploys from `main` via `.github/workflows/deploy.yml`. Tests run before every deploy. |
| Model files | Served from the Hugging Face CDN, so they stay outside GitHub's 100MB file limit. |

## Sources

- [ELIZAGEN: Joseph Weizenbaum's Original ELIZA](https://sites.google.com/view/elizagen-org/original-eliza)
- [ELIZA Reanimated (arXiv 2501.06707)](https://arxiv.org/abs/2501.06707v1)
- [Original ELIZA source code in MAD-SLIP (archive.org)](https://archive.org/details/eliza_1966_mad_slip_src)
- [anthay/ELIZA](https://github.com/anthay/ELIZA)
- [rupertl/eliza-ctss](https://github.com/rupertl/eliza-ctss)
- [IEEE Spectrum: The First Chatbot's Multiple Personalities](https://spectrum.ieee.org/eliza-chatbot-source-code)
- [IBM 2741 (Wikipedia)](https://en.wikipedia.org/wiki/IBM_2741)
- [IBM 2741 Version 2 Maintenance Diagrams, 1970 (bitsavers)](https://ftp.mirrorservice.org/sites/www.bitsavers.org/pdf/ibm/2741/2741_Version_2_Maintenance_Diagrams_Jun70.pdf)
- [MIT CTSS Programming Staff Note 69](https://mit.edu/saltzer/www/publications/ctss/psn-69.pdf)
- [Suno commercial use guide 2026 (terms.law)](https://terms.law/ai-output-rights/suno/)
- [Suno vs Udio 2026 (musicwave.ai)](https://www.musicwave.ai/blog/suno-vs-udio)
- Hugging Face model API: `Xenova/gpt2`, `onnx-community/gpt2-medium-ONNX`, `openai-community/openai-gpt`
- `@huggingface/transformers` 4.3.2 package contents

---

# Milestone 3: Model runtime (2026-11-20)

## GPT-1 test result: success

- `tools/models/convert_gpt1.py` rebuilds GPT-1 in PyTorch and exports ONNX with a key/value cache and GPT-2's interface. Compared with Hugging Face's reference `OpenAIGPTLMHeadModel`: max logit difference **9e-5**, and identical greedy text over 21 tokens, including the cached step-by-step path.
- A bug found on the way: GPT-1 uses the **tanh approximation of GELU**. The exact GELU gave logit differences of about 0.09.
- It runs in Transformers.js 4.3.2 as `GPT2LMHeadModel`. GPT-1's own tokenizer (BERT normalizer and pre-tokenizer, BPE with `</w>`) works unchanged.

## Quantization: weight-only 8-bit for both models

| File | Size | Top-1 agreement vs full precision | Mean KL |
|---|---|---|---|
| GPT-1, dynamic 8-bit (standard) | 117 MB | 70% (per-tensor) / 76% (per-channel) | 0.41 / 0.19 |
| **GPT-1, weight-only 8-bit (shipped)** | **117 MB** | **96%** | **0.008** |
| GPT-2, `Xenova/gpt2` dynamic 8-bit (standard) | 128 MB | 74% | 0.19 |
| GPT-2, weight-only 8-bit, per-word embedding scales | 128 MB | 77% | 0.056 |
| **GPT-2, weight-only 8-bit, per-dimension embedding scales (shipped)** | **128 MB** | **95%** | **0.004** |

Measured over 97–98 tokens of mixed text (`tools/models/compare_gpt*.py`). GPT-2's embedding table has a few "rogue" dimensions with huge values, so it needs one scale per dimension.

## Browser performance (Claude's built-in browser, Apple Silicon Mac)

| Model | WebGPU | CPU (WASM, single-threaded) |
|---|---|---|
| GPT-1 | 17.7 tok/s cold run, 51 tok/s warm | 6.0 tok/s |
| GPT-2 | 24.4 tok/s cold run | 6.8–6.9 tok/s |

First streamed token in about 0.2 s. Loading from the browser cache takes 0.7–0.9 s. PRD targets: 15 and 4 tok/s. ✅

## Hosting

- Model files are GitHub Release assets (`models-v1`), copied into the Pages site by the deploy workflow with SHA-256 checks. Same origin, no extra accounts, nothing large in git history.
- **Update 2026-11-20:** the primary host is now the Hugging Face repo `almostmike/mad-models` (public, free; per HF's storage-limits page, public storage on free accounts is "best-effort" with no listed download fees), pinned to commit `94fd3b2`. GitHub Pages remains the automatic fallback, so its soft 100 GB/month bandwidth limit only matters if Hugging Face is down. Measured download of the 117 MB GPT-1 file: Hugging Face 4.6–7.5 s, GitHub Pages 3.7–4.6 s.

## Runtime findings

- **Transformers.js 4.3 local paths:** `env.localModelPath` must be site-relative (`/mad-models/models/`), not a full URL. With a full URL it skips its existence check, caches "not found", and fails with `reading 'tokenizer_class'`.
- **Stopping on the CPU:** single-threaded WASM never yields to the worker's message queue mid-generation, so a stop message waits until the end. `ModelClient.abort` restarts the worker after 300 ms and keeps the partial text. Measured: stop in 304 ms, next generation works after a ~0.9 s reload.
- **GPT-1 spacing:** its decoder drops the space before the first generated word ("spray" + "stung"). The worker and recorder add it back.
- **13+ filter:** with `bad_words_ids` on, a prompt that forces a blocked word never produces it, in either model. Without the filter, both do.
- **Archive Mode:** 60 real outputs per model recorded with the same files and filter (`tools/archive/record.ts`). Replay streams at 14 tok/s.
