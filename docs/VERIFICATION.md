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
