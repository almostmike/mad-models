# Credits

Third-party assets, models and tools, with licenses. Factual sources are in [SOURCES.md](SOURCES.md).

## ELIZA

- **ELIZA** (1964–1966) by Joseph Weizenbaum, MIT. The original MAD-SLIP source was released under CC0 by the Weizenbaum estate (see the ELIZAGEN project).
- **Engine port:** `src/engine/eliza/` is a TypeScript port of Anthony Hay's faithful simulation of the 1966 ELIZA ([anthay/ELIZA](https://github.com/anthay/ELIZA), CC0-1.0). The test conversations come from the same repository.
- **DOCTOR script:** the 1966 CACM appendix version, from Weizenbaum's paper "ELIZA — A Computer Program for the Study of Natural Language Communication Between Man and Machine," *Communications of the ACM* 9(1), January 1966 (© 1966 ACM), as transcribed by Anthony Hay.

## Models and runtime

- **GPT-1** (Radford et al., 2018) and **GPT-2** (Radford et al., 2019) weights by OpenAI, MIT License, via the Hugging Face Hub (`openai-community/openai-gpt`; `Xenova/gpt2` ONNX export of `openai-community/gpt2`). Converted and quantized for the browser by `tools/models/`, and hosted at [huggingface.co/almostmike/mad-models](https://huggingface.co/almostmike/mad-models).
- **Transformers.js** by Hugging Face, Apache-2.0.
- **ONNX Runtime Web** by Microsoft, MIT License.

## Art and audio

- **Scene images** (the 1966 office, Dorothy at the door, the 2018 office and the 2019 night office): generated with **ChatGPT** image generation (OpenAI) by the project owner, chosen over Gemini and Meta AI in a side-by-side test. AI-generated; no real people depicted. Originals are archived outside the repo.
- **Music**: three tracks made with **Suno** (suno.com) on the free plan, credited and used non-commercially: "Project MAC 1966" (cool jazz), "Mission District 2018" (lo-fi) and "New Loss 2019" (alt-rock ballad).
- **Dorothy's voice**: an original voice designed with **ElevenLabs** (elevenlabs.io) Voice Design, lines spoken with Eleven v4.
- **Sound effects**: synthesized in the browser with the Web Audio API (`src/audio/sfx.ts`); no samples.
- **Link-preview image** (`public/og.jpg`): the 1966 scene image with the game's own type, rendered by `tools/og/render.sh`.
- **Certificate**: drawn in the player's browser on a canvas; nothing is uploaded.

## Recorded model outputs

- `public/archive/*.json` holds real GPT-1 and GPT-2 outputs, recorded with `tools/archive/record.ts` from the same model files and word filter the game uses. One finale sample that invented a quote from a real politician was removed by hand.

## Fonts

- **Courier Prime**, **Archivo** and **Archivo Narrow**, SIL Open Font License.

## Made with

- Designed and built with **Claude** (Anthropic) in Claude Code, working with the project owner.
