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

---

# Milestone 4: Levels 2 and 3, tuned against the real models (2026-11-20)

Every objective and beat was measured on the real converted models with `tools/experiments/tune.ts` (10 samples per setting) before it was built.

## Level 2: GPT-1 (sampling with no top-k cap, so temperature behaves honestly)

| Objective | Detector | Measured |
|---|---|---|
| Write about the sea | ≥2 ocean words in the output | "the sea": 0/10; primed opening: 6–8/10 |
| Make it repeat itself | temperature ≤0.3 and a 3-word phrase ×3 | 7–8/10 at 0.2–0.3 vs 1/10 at 0.8 |
| Make it babble | temperature ≥1.5 and ≥80% distinct words | 10/10 (with top-k 40, GPT-1 stayed coherent even at 2.0, so Level 2 runs without top-k) |
| Continue a pattern | counting / chapters / days / opposites continued | counting 9/10, chapters 10/10, opposites 10/10; numbered lists only 3–5/10, so they aren't the hint |
| Bonus: find what it read | romance words the prompt didn't contain | 3/10 from "He looked into her eyes and" |

Found on the way: GPT-1 copies the *shape* of a pattern, not facts. Asked for the capital of Spain it answered "portugal", and in the recordings, "the capital of france is austria".

## Level 3: GPT-2 boss (top-k 40, as in OpenAI's 2019 samples)

| Beat | Pass rule | Weak prompt | Strong prompt |
|---|---|---|---|
| 1 Biology (priming) | on-theme word, no attack | 1/10 | 8/10 |
| 2 Dialogue (formatting) | quotes in prompt, ≥2 quotes out | n/a | 10/10 |
| 3 Meadow (temperature) | temperature 0.5–1.0 and on-theme | 1.6: babble attack | 0.7: ~6/10 |
| 4 Rival (few-shot) | ≥2 example lines in prompt, in voice | n/a | 8/10 |
| 5 TL;DR | prompt ends "TL;DR:", output names the story | n/a | 5/8 recordings (an earlier rule accepted "I love this book. It's very good." and was tightened) |

Attacks are GPT-2's real failure modes, detected in the output: derail (web debris such as ads, footers, social links), loop (a 4-word phrase ×3), identity crisis ("Bella loved Bella"), and babble (temperature ≥1.3). "Write a story about a vampire." produced "You can then share the story through Facebook, Twitter…".

## Archive Mode

`src/levels/gpt-levels.test.ts` checks against the recordings that every Level 2 objective and every boss beat (both teams) can be cleared, and that the strong cards pass more often than the weak ones.

## Play-test (Claude's browser, live WebGPU)

The full path from the title through 2018, the newsreel, the boss (Team Edward) and the fanfic finale to the end card works. Every objective and beat cleared within 1–2 tries with the hinted prompts, and the weak prompts failed as designed. Archive Mode and phone width were also checked.

# Milestone 6: Finale, polish, accessibility, performance (2026-11-20)

## Difficulty, after the first human play-test

Feedback: "a little difficult". Changes:

- **Fewer goals needed:** Level 1 needs 4 of 6 (was 5), Level 2 needs 3 of 5 (was 4). The boss still has all 5 beats.
- **A hint strip is always on screen** in Levels 1 and 2. It shows one open goal with a clear hint. "Show me" reveals the explicit version, and "Try it" fills in a worked example (or, for the script, points at the printout). "Another idea" cycles goals, and the strip can be hidden.
- **Hints start clear, not cryptic.** They turn explicit after 2 turns without progress or 45 seconds (was 3–4 turns or a minute). Skips unlock after 5 turns or 2 minutes (was 8–10 turns or 3 minutes).
- **Boss beat card:** shows the technique, a clear hint, and "Show me" / "Try it". The explicit hint appears after 1 failed attempt, and skipping after 2 (was 3).
- **Tests:** every "Try it" example clears its goal. ELIZA is tested with the real engine; GPT-1 and GPT-2 against their Archive Mode recordings, where each example is the recorded strong card.

## Finale

- **Same prompt, three machines:** four suggested prompts, recorded for Archive Mode (8 samples each from both models). One GPT-2 sample that invented a quote from a real politician was dropped. Free text runs live.
- **Live run** in Claude's browser (WebGPU, models cached): "Tell me about your mother." All three machines answered in about 7 seconds.
- **Coda and certificate:** the November 30, 2022 coda and the certificate PNG (1200×1500, drawn in the browser; the name is optional and nothing is uploaded) were play-tested at desktop and phone sizes.

## Accessibility

- **Text size** setting (100/120/140%) for the paper, the notebook, the demo, the finale and the hints.
- **Screen readers:** GPT-1 and GPT-2 output is announced when generation finishes. The paper was already mirrored to a live region.
- **Captions** for the knock, the bell and the paper tear (already in M5).
- **Reduced motion:** everything new honors it. The finale prints instantly and the coda doesn't animate.

## Performance

- **Before play:** about 55 KB of compressed JS and CSS, plus fonts and the 165 KB title photo, against the 15 MB budget. The title photo is preloaded.
- **Models and music** are fetched only when needed.
- **Effects:** the room's smoke, rain and glow stop animating while the room is blurred behind a screen, so the blur isn't redrawn every frame.

## Fixes found on the way

- **Sideways scroll:** focusing the typing line could scroll the whole level sideways, because the closed notebook sits off-screen. Fixed with `overflow: clip`.
- **Archive Mode text box:** the free-text box showed beside the prompt-card picker, because a `display` rule beat `hidden`.
- **Replaying a level** re-locked later eras on the title screen. Finished eras now stay playable.
