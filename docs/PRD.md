# Mad Models — Product Requirements Document

*Working title. Version 1.0, drafted 2026-11-20.*

> A short, beautiful browser game where you prompt three real language models from three eras of AI. ELIZA (1966) runs at MIT on a clacking printing terminal. GPT-1 (2018) runs in a San Francisco startup. GPT-2 (Valentine's Day 2019) is "the model too dangerous to release," and it is obsessed with vampire fanfiction.

Items marked ⚠️ still need verifying. The Milestone 0 findings are in `docs/VERIFICATION.md`.

---

## 1. Vision and pillars

**One-line pitch:** Play through the history of prompting. Talk to the actual machines, not imitations, and feel how far we've come.

| Pillar | What it means in practice |
|---|---|
| **Authentic engines** | ELIZA is a faithful port of Weizenbaum's 1966 algorithm and DOCTOR script. GPT-1 and GPT-2 are the real released weights, running live in the player's browser. Nothing is faked unless the device can't run it, and then we say so on screen. |
| **Aesthetics matter** | Photoreal 2.5D scenes, period-correct sound, typography and props. Every era should be screenshot-worthy. |
| **Learn by playing** | Each level teaches one idea about how that model works. Players discover it by doing, not by reading walls of text. |
| **Short and funny** | 15–25 minutes in total. Playful tone, a real ending, a shareable result. |
| **$0 to run** | Static site on GitHub Pages. Models run client-side. No servers, no API keys, no per-player cost. |

## 2. Decisions locked (from Q&A, 2026-11-20)

| # | Decision |
|---|---|
| 1 | Level 1 is set at **MIT Project MAC (545 Technology Square), 1966**, with Mad Men décor and vibes. |
| 2 | ELIZA is played on an **authentic printing terminal** (IBM 2741-class typewriter terminal on paper), with full sound effects. No CRT. |
| 3 | **2.5D photoreal** visuals. Images come from ChatGPT Images or Meta AI. Claude drives the browser and picks the best results. |
| 4 | Music comes from **Suno**, used the same way (Udio dropped in M0; see §11.2). SFX come from free-licensed libraries. |
| 5 | Level-up uses **era objectives that teach how each model works** (detailed below). |
| 6 | The GPT-2 boss leans fully into the **Twilight-fanfic parody**. The running joke is that GPT-2 was "built on Twilight fanfic." It's clearly parody, so we have fun with it. |
| 7 | **13+ / PG-13.** Swooning and brooding are fine. Explicit content, slurs and gore are filtered. |
| 8 | **Desktop browser first.** Mobile works but is slower or falls back. Target 15–25 minutes. |
| 9 | **Public GitHub repo plus GitHub Pages** for free hosting and a public link. |

## 3. Audience and platform

- **Audience:** curious adults and teens (13+), AI-curious professionals, teachers, and people who lived through any of these eras. No technical knowledge needed.
- **Platforms:**
  - Desktop Chrome, Edge, Safari and Firefox (latest two versions).
  - WebGPU is used where available, with a WASM fallback.
  - Mobile Safari and Chrome are supported with reduced effects. They use Archive Mode (§9.5) when models can't load.
- **Input:** keyboard first. Every action also works by mouse or touch.
- **Session:** about 5–7 minutes per level, plus interstitials and the ending. Progress is saved in the browser so players can leave and return.

## 4. Player journey

```
Title screen ("Mad Models", jazz, cigarette smoke, a printing terminal waiting)
  └─ Level 1: ELIZA, MIT, 1966
       └─ Era Jump newsreel: 1966 → 2018 (AI winters, Deep Blue, ImageNet, "Attention Is All You Need")
            └─ Level 2: GPT-1, San Francisco, June 2018
                 └─ Era Jump: 2018 → 2019 ("OpenAI's new AI is too dangerous to release")
                      └─ Level 3 BOSS: GPT-2, February 14, 2019
                           └─ Finale: one prompt, three models, side by side
                                └─ Coda: a blinking chat box dated November 30, 2022. "To be continued."
                                     └─ Shareable "certificate" printed on teletype paper
```

After the player finishes, **Level Select** unlocks, along with a **Sandbox** where they can chat freely with any of the three models.

### Core loop (every level)

1. **Establishing shot.** The room view, first person, with parallax and ambient life.
2. **Lean in.** The camera pushes into the focused interface: the paper, the notebook, or the web demo.
3. **Prompt → watch the model respond → discover something** (an objective ticks off).
4. **Hints** come from in-world props: a printout on the desk, a Slack message, a whiteboard.
5. **Clear the objectives → the era's upgrade moment → Era Jump.**

### Shared systems

- **Lab Notebook.** An always-available checklist of the level's objectives. Uncleared objectives show as cryptic hints and get clearer after failed attempts.
- **Placards.** Short museum-style cards (3–4 sentences) that pop up when an objective clears and explain the real mechanism. They're collected into a "Museum" page reachable from the menu.
- **No dead ends.** Generative models are random. Any objective can be **skipped after 3 failed attempts or 3 minutes**, with a one-line explanation of what should have happened.

---

## 5. Level 1: ELIZA (MIT, 1966)

### 5.1 Setting and vibe

- **Place:** a Project MAC office at 545 Tech Square, Cambridge, MA. A late-afternoon autumn day in 1966.
- **Décor:**
  - Wood paneling, a steel tanker desk, a green banker's lamp, and an overflowing glass ashtray.
  - A rotary phone, an IBM manual binder, and a corkboard with a CTSS schedule.
  - A coffee cup with a lipstick ring, a framed Harvard diploma that isn't yours, and amber window light through Venetian blinds.
- **The terminal:** an IBM 2741-class typewriter terminal. A Selectric-style typeball, continuous paper, and a gentle motor hum.
- **Characters** (seen, not interactive beyond short lines):
  - **Dorothy**, the department secretary (fictional). She stops by and asks you to leave the room while she "uses the machine." This is a nod to the real story of Weizenbaum's secretary.
  - Professor Weizenbaum is "away at a conference." He's referenced on notes and the printout, never depicted speaking.

### 5.2 The interface: printing terminal

- The **player's input is typed onto the paper as they type**, with a key clack for each character, exactly as it worked in 1966.
- **ELIZA's reply prints in UPPERCASE** at 14.1 characters per second (the 2741's real speed). Each character gets a typeball strike sound.
- Every line ends with a **carriage return and line feed** (carriage slam and ratchet). The **bell** dings at the end of a session.
- **The paper scrolls up and stays.** The whole conversation is a growing physical printout. The player can scroll back up the paper.
- **Ink realism:**
  - Slight per-character jitter in position, rotation and darkness.
  - The ribbon gets fainter over time and is "re-inked" on level reset.
  - Black ink only. Two-color printing was a rare hardware add-on, so ELIZA's replies are set apart by UPPERCASE, as in the 1966 paper.
- **Session start ritual** (15 seconds, skippable): a stylized CTSS login (`login`, a password prompt where the typing is overstruck for privacy, then `r eliza`), and then ELIZA's opening line: **HOW DO YOU DO. PLEASE TELL ME YOUR PROBLEM.**
- **Font:** Courier Prime (OFL), with an ink-bleed shader. No anachronistic glyphs.

### 5.3 The engine: real ELIZA

A **faithful JavaScript port of the 1966 algorithm** running the **original DOCTOR script**, behavior-matched to the published sources:

- **Sources:**
  - Weizenbaum, J. (1966), "ELIZA — A Computer Program for the Study of Natural Language Communication Between Man and Machine," *CACM* 9(1). It includes the DOCTOR script and a sample conversation.
  - The original MAD-SLIP source recovered from the MIT archives (ELIZAGEN project). Released under CC0 by the Weizenbaum estate.
  - Anthony Hay's faithful simulation (`anthay/ELIZA`, CC0). Our engine is a TypeScript port of his JavaScript version, with a reply report added for the game's objectives.
  - The default script is the **1966 CACM** version of DOCTOR. The recovered listing differs slightly, and our acceptance test is the paper's conversation.
  - The "ELIZA Reanimated" project (2025), which ran the original on an emulated IBM 7094 CTSS.
- **Must implement:**
  - Keyword scanning with ranks.
  - Sentence delimiters (comma and period cut the input at the first sentence with a keyword).
  - Pronoun and verb substitution (I↔YOU, MY↔YOUR, AM↔ARE…).
  - Decomposition patterns with reassembly rules that cycle in order (not randomly).
  - Keyword equivalence classes.
  - The `NONE` fallback list.
  - **The MEMORY mechanism:** inputs containing "MY" are stored and replayed later ("EARLIER YOU SAID YOUR…").
- **Acceptance test:** feeding in the user lines from the 1966 paper's sample conversation must reproduce ELIZA's published replies **exactly**. This runs as a unit test in CI.
- **Quirks we keep on purpose:** odd outputs from punctuation, echoes that repeat your grammar mistakes back to you, and running out of reassembly rules.

### 5.4 Objectives (clear 5 of 6 to advance)

| # | Objective (as shown in the Lab Notebook) | How it's detected | What the placard teaches |
|---|---|---|---|
| 1 | **"Mention the family."** | The FAMILY/MOTHER keyword rule fires. | Keywords with ranks. ELIZA looks for trigger words, not meaning. |
| 2 | **"Make it talk back to you."** | Pronoun substitution produces a reflected phrase ("WHY DO YOU SAY YOU ARE…"). | Pronoun swapping is the main illusion of "listening." |
| 3 | **"Make it remember."** | The MEMORY replay fires. | ELIZA's only "memory" is a tiny queue of sentences that contained "my." |
| 4 | **"Stump the doctor."** | The `NONE` fallback fires ("PLEASE GO ON."). | No keyword means a canned stall. |
| 5 | **"Ask if it's a machine."** | The COMPUTER keyword fires ("DO COMPUTERS WORRY YOU?"). | Even the self-awareness is a rule. |
| 6 | **"Read the script."** | The player inspects the DOCTOR printout on the desk and finds the keyword list. | The whole personality fits on a few pages. |

**Upgrade moment:**
- Dorothy knocks, sees the printout, and says she feels *understood*. This sets up the **ELIZA effect** placard: Weizenbaum was disturbed that people confided in a pattern-matcher.
- The terminal then prints a line the script can't produce: **`SEE YOU IN 2018.`**
- The paper tears off, film grain swells, and the Era Jump begins.

---

## 6. Era Jump interstitials

- About 45-second **newsreel montages**, skippable. They're built in HTML/CSS, not video: headlines, dates, film grain, and a narrator card.
- **1966 → 2018:**
  - SHRDLU (1970), PARRY (1972), the first AI winter (1974).
  - Expert systems (1980s), Deep Blue beats Kasparov (1997), ImageNet / AlexNet (2012).
  - "Attention Is All You Need" (June 2017).
  - The music crossfades from vibraphone jazz through synthesizers to lo-fi.
- **2018 → 2019:** the GPT-2 announcement on Feb 14, 2019, and the "too dangerous to release" headlines.
- Each date is a fact-checked placard that gets added to the Museum.

---

## 7. Level 2: GPT-1 (San Francisco, June 2018)

### 7.1 Setting and vibe

- **Place:** an AI research startup office in SF's Mission District, a sunny afternoon in June 2018.
- **Décor:**
  - Exposed brick and an Edison-bulb pendant.
  - A standing desk with dual monitors, an ergonomic chair, and LaCroix cans.
  - A fidget spinner, a whiteboard with a hand-drawn transformer diagram and "117M!!" circled, and a hoodie on the chair.
  - Slack notifications, a ping-pong table in the background, and a view of fog.
- **Tone:** earnest optimism. Nobody in the room knows what's coming.

### 7.2 The interface: notebook

- A Jupyter-style notebook cell on the monitor:
  ```
  In [7]: generate(prompt="...", temperature=0.8, max_tokens=60)
  ```
- The player types the prompt, then presses **Shift+Enter** or clicks **Run**. Output **streams token by token** into `Out [7]:`.
- **Sliders** unlock as objectives teach them: **temperature** first, then **length**.
- **Authentic quirks we show:**
  - GPT-1's tokenizer lowercases and splits punctuation, so output looks like `" i 'm not sure , " she said .`
  - A 512-token context limit. A token counter shows it filling up.

### 7.3 The engine: real GPT-1

- **Model:** OpenAI's original GPT (117M parameters, `openai-gpt` on Hugging Face, MIT license).
- **Runtime:**
  - Transformers.js (`@huggingface/transformers`) in a Web Worker. WebGPU where available, WASM fallback.
  - 117MB (weight-only 8-bit, 96% next-word agreement with full precision). Cached by the browser after the first load.
  - **It starts downloading quietly during Level 1**, so it's usually ready by the time the player arrives.
- **Conversion (done in M3):** `tools/models/convert_gpt1.py` exports GPT-1 with a KV cache and GPT-2's interface; it matches Hugging Face's reference implementation exactly. It runs at 18–51 tok/s on WebGPU and 6 tok/s on the CPU. See `docs/VERIFICATION.md`.
- **Training-data fact we exploit:** GPT-1 was trained on **BookCorpus**, about 7,000 unpublished books heavy in romance and fantasy. It drifts into paperback-novel prose, which sets up Level 3.

### 7.4 Objectives (clear 4 of 5 to advance)

| # | Objective | Detection | Placard |
|---|---|---|---|
| 1 | **"Say hello."** | Any first run. The model doesn't greet back; it *continues* the text. | These models aren't chatbots. They predict the next word of a document. Prompting = writing the start of the document you want. |
| 2 | **"Get it to write about the sea."** | The output contains ≥3 words from an ocean lexicon. | Prime the context. Topic words in the prompt pull the continuation toward them. |
| 3 | **"Make it loop."** | Temperature ≤0.3 and a repeated 4-gram appears ≥3 times. | Low temperature means always picking the likeliest word, which leads to repetition. |
| 4 | **"Make it babble."** | Temperature ≥1.5 and a high ratio of non-dictionary words. | High temperature means randomness. Sampling is a dial between boring and nonsense. |
| 5 | **"Continue the pattern."** | The prompt contains a numbered list, and the output continues the numbering (`4.`). | Few-shot prompting. Show it the format and it copies the pattern. |

**Hidden bonus objective:** *"Find out what it read."* The output trips a romance-novel lexicon ("her eyes," "whispered," "kissed"). This unlocks the BookCorpus placard and a Slack message: *"why does it keep writing romance novels lol."*

**Upgrade moment:**
- Slack pings: **"GPT-2 is done training. 10x bigger. Leadership says we can't release it."**
- The whiteboard number is crossed out and "1.5B" is written over it. The monitor glitches pink.
- Era Jump.

---

## 8. Level 3 BOSS: GPT-2 (February 14, 2019)

### 8.1 Premise (the joke)

GPT-2 was trained on **WebText**: about 8 million web pages linked from Reddit posts with 3 or more karma. That's real. In our game, the 2008–2012 internet's vampire-romance fanfiction has *consumed* it. That's parody, and the game says so with a wink.

It's Valentine's Day. The model is "too dangerous to release." The danger, it turns out, is that it won't stop writing about a brooding, sparkling, 104-year-old in Forks, Washington.

**Boss title card:** **GPT-2: NEW LOSS** *(The Sparkling Transformer)*

### 8.2 Setting and vibe

- **Place:** the same office, now after dark on Feb 14, 2019.
- **Décor:**
  - Rain streaks down the window: Pacific Northwest energy that has followed you to SF.
  - Wilting Valentine's balloons, a heart-shaped box of chocolates, and a red binder labeled **DO NOT RELEASE**.
  - A press headline on the second monitor, and a server rack with an ominous pink-purple glow.
  - A sticky note: *"Team Edward or Team Jacob? Asking for the model."*
- **Music:** a moody late-2000s alt-rock ballad with brooding piano and crashing drums (original Suno track; see §11).

### 8.3 The interface: 2019 web demo

- An original late-2010s "try the model" web page: a big text box, a **Generate** button, a spinner, and output streaming in a different color.
- Its own design (not a copy of any real site), with the period's flat design, rounded buttons and hero gradients.
- The **Boss HUD** frames the page:
  - **Coherence** (player's HP).
  - **Sparkle Meter** (how on-theme the story is).
  - **Chapter Progress** (beats completed).

### 8.4 The engine: real GPT-2

- **Default:** GPT-2 small (124M), 128MB weight-only 8-bit (95% next-word agreement; the standard `Xenova/gpt2` 8-bit file manages 74%), prefetched during Level 2.
- **Optional "Full Release" toggle** on capable desktops (WebGPU, ≥8GB RAM detected): GPT-2 medium (355M), a 562MB download, shown with a clear size warning and never prefetched.
  - This is a nod to the real **staged release**: 124M in Feb 2019, 355M in May, 774M in August, 1.5B in November.
  - 774M and 1.5B appear as **locked vault doors marked "TOO DANGEROUS"**. That's a joke and an education point; they can't be played.
- **No fine-tuning on actual fanfiction.** The fanfic voice comes from **our original parody prompts and beat setups**. GPT-2 base slides into the genre easily. This keeps us clear of copying anyone's text.

### 8.5 Boss mechanics

**Pick a side:** *Team Edward* or *Team Jacob*. This changes the beat lexicons, the scripted taunts and the ending card.

**The fight:** co-write **Chapter 1** of the parody across **5 beats**:

| Beat | Setup | Prompting technique the beat rewards |
|---|---|---|
| 1. **Biology class** | Bella meets the mysterious new student. | Priming: write the opening sentences in the voice you want. |
| 2. **"You smell like… gradients."** | The awkward, intense first conversation. | Dialogue formatting. Quotation marks and speaker tags make GPT-2 continue the dialogue. |
| 3. **The meadow** | Sunlight. The sparkle reveal. | Temperature control: keep it lyrical but coherent. |
| 4. **The rival arrives** | Werewolf energy (or vampire energy, for Team Jacob). | Few-shot: give two example lines of the rival's voice. |
| 5. **Finishing blow: TL;DR** | Summarize the whole saga. | **The `TL;DR:` trick.** OpenAI's GPT-2 paper actually used this to get summaries out of a model with no instructions. |

**Scoring each attempt** (all client-side heuristics, no paid AI judge):
- **On-theme:** words from the beat's lexicon appear in the output, which raises the Sparkle Meter.
- **Coherent:** low n-gram repetition, a high dictionary-word ratio, and sentence-like punctuation.
- **Didn't derail:** no WebText artifacts like "Click here to subscribe," "Advertisement," forum signatures, copyright footers, sports scores or recipe ingredients.

**GPT-2's "attacks"** are its real failure modes, detected in the output and dramatized with screen shake and a sting:
- **Derail:** the story turns into a news article, forum post or ad. This drains Coherence. Each derail gets a mocking caption ("GPT-2 has wandered onto a 2009 Blogspot.").
- **Loop:** it gets stuck repeating a phrase.
- **Identity crisis:** it swaps character names mid-paragraph.

**Winning:** clear all 5 beats before Coherence reaches zero. If Coherence runs out, the player retries that beat (no full restart). Beats can still be skipped after 3 failed attempts, per §4.

**The finale:**
- The TL;DR output is typeset onto a **"Chapter 1" fanfic page** in a 2009 fanfic-archive style (original design).
- It shows the player's best lines, author's notes ("A/N: plz review!!"), and a parody disclaimer: *"I don't own Twilight. I don't own anything. I am 124 million parameters."*

### 8.6 In-world comedy (scripted, not generated)

- **Slack messages from the "safety team":**
  - *"Why does every sample mention Forks, Washington?"*
  - *"WebText is 8M pages linked from Reddit. Some of those links were… fanfiction.net."*
  - *"Do NOT let the press see the meadow chapter."*
- **Taunt captions when GPT-2 derails:** *"Bella, I am also a recipe for banana bread."*
- **The placard** keeps it honest. It explains what WebText really was, the staged-release debate, and the note: *"We exaggerated the fanfic. A little."*

---

## 9. Technical architecture

### 9.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + TypeScript** | Fast and static output for GitHub Pages. |
| UI | Vanilla TS + small components (or Preact if it grows) | Keeps the bundle small. The scenes are mostly layered images plus one interactive surface. |
| Rendering | DOM/CSS for scenes and parallax. **Canvas** for the paper and ink. Lightweight **WebGL** shaders for CRT/monitor glow, rain and film grain. | 2.5D without a 3D engine. |
| Audio | Web Audio API (or Howler.js) | Low-latency, per-keystroke SFX, crossfading music. |
| Models | **Transformers.js v3** in a **Web Worker** | Real GPT-1 and GPT-2 in the browser. WebGPU with WASM fallback. Streaming tokens. |
| ELIZA | Pure TS module, no dependencies | Faithful port plus a unit test against the 1966 transcript. |
| Save | `localStorage`, wrapped in try/catch | Progress, settings, unlocked placards. The game works fine without it. |
| Tests | Vitest | ELIZA fidelity tests, objective detectors, filters. |
| Hosting | **GitHub Pages via GitHub Actions** | $0, public URL, deploys on push to `main`. |
| Model files | **Hugging Face repo** `almostmike/mad-models` (pinned commit), with **GitHub Release** `models-v1` copied into the Pages site as an automatic fallback | Free CDN with no bandwidth cap; the GitHub copy keeps the game working if Hugging Face is down. |

### 9.2 Model loading strategy

- **Title screen:** load only the art and audio for Level 1 (target ≤15MB).
- **During Level 1:** prefetch GPT-1 in the background. A diegetic progress indicator shows as a "Warming the vacuum tubes…" note.
- **During Level 2:** prefetch GPT-2 124M.
- **If a model isn't ready when its level starts:** show an in-world loading screen ("Training… just kidding, downloading.") with a progress bar and an explanation of how big the model is and why.
- **Capability check at start:** WebGPU availability, `navigator.deviceMemory`, connection type, and a quick generation benchmark. This picks **Live**, **Live (WASM, slower)** or **Archive Mode**.

### 9.3 Generation settings

- **GPT-1:** top-k 40, temperature 0.8 by default (the player can change it), max 60 new tokens.
- **GPT-2:** top-k 40, temperature 0.9, max 80 new tokens, repetition penalty off.
  - Repetition penalty stays off **on purpose**, so the loops are authentic. Boss scoring tolerates them.
- **Re-roll** is always available. Each attempt shows the seed for the curious.

### 9.4 Content safety (13+)

- **Generation-time:** `bad_words_ids` (supported in Transformers.js 4.3.2) for a blocklist of slurs and explicit terms.
- **Post-filter:** regex and lexicon checks on the streamed text. If a hit occurs, the output is **redacted with a period-appropriate gag**: a typed-over **XXXXX** in 1966, a `[REDACTED BY SAFETY TEAM]` sticker in 2019. Then it auto-re-rolls.
- **Input filter:** light. It blocks slurs in player prompts with a friendly message.
- **ELIZA** needs no output filter; it only reflects the player's words, which are already input-filtered.
- A **"Why was this redacted?"** placard explains that raw models had no safety training, which is itself educational.

### 9.5 Archive Mode (fallback)

- For devices that can't run the models: phones with low memory, old browsers, slow connections.
- **Pre-recorded real outputs** from the actual GPT-1 and GPT-2, generated offline by us. They're stored as JSON, about 1–2MB.
- In Archive Mode, the player picks from **prompt cards** (3–4 per objective or beat) and can tweak a word or two from a dropdown. The game plays the matching recorded output.
- A clear banner: *"Archive Mode: these are real outputs we recorded from GPT-2."*
- All objectives remain completable.

### 9.6 Repo structure

```
mad-models/
  .github/workflows/deploy.yml     # build + deploy to Pages
  public/
    art/{l1,l2,l3,title,ending}/   # optimized WebP/AVIF layers
    audio/{sfx,music}/             # OGG/AAC/MP3
    archive/                       # pre-recorded model outputs (JSON)
  src/
    engine/eliza/                  # port + DOCTOR script + tests
    engine/models/                 # worker, loader, generation, filters
    levels/{eliza,gpt1,gpt2}/      # scenes, objectives, scripts
    ui/                            # terminal paper, notebook, web-demo, HUD, placards
    audio/  shaders/  save/
  docs/PRD.md  docs/CREDITS.md  docs/SOURCES.md
  LICENSE (MIT for code)  README.md
```

---

## 10. Art direction and asset pipeline

### 10.1 Look

- **1966:** warm Kodachrome. Amber window light, tobacco haze, deep wood browns, Mad Men mid-century palette. Film grain on top.
- **2018:** bright, clean daylight. Whites, brick, and blue monitor light. Instagram-era warmth.
- **2019 boss:** night, rain and moody blue, broken by Valentine's pink and an ominous purple server glow. A Twilight-poster color grade (desaturated blue-green) bleeds in as the Sparkle Meter rises.

### 10.2 How 2.5D works

- **Two camera states per level:**
  - The **room view**: a wide first-person establishing shot with 3–4 parallax layers that move gently with the mouse or device tilt.
  - The **focused view**: a near-straight-on close-up of the interactive surface (paper, monitor or web page).
  - A smooth push-in/pull-out transition links them.
- **The interactive surface is rendered by us** (canvas or DOM) and composited into the photo. So the text is always crisp, readable and real. The photo provides the machine, desk, hands-free framing and lighting.
- **Ambient life:**
  - Cigarette smoke (particle canvas) and fluorescent flicker.
  - Dust in light beams and blinds shadows that shift slowly.
  - 2018: Slack toast pop-ups and a fan. 2019: a rain shader and a balloon slowly sinking.

### 10.3 Image production

- **Tools:** ChatGPT Images and/or Meta AI, driven by Claude through the user's browser.
  - The user approves the session and each batch download.
  - Claude generates several candidates per shot and picks the best, with a short reason for each choice.
- **Layering:** for each scene, generate a **clean background plate** plus **foreground props on a plain background** (cut out for parallax).
- **Consistency:** one locked style prefix per era, the same camera height and lens description, and reference images fed back in for follow-up shots.
- **Accuracy checks:**
  - Compare the generated IBM terminal against real IBM 2741 reference photos.
  - Reject anachronisms: no laptops in 1966, no iPhone X in early 2018 shots that should feel mid-2018. Nitpicking is welcome.
- **Shot list (v1, about 20 images):**

| Scene | Shots |
|---|---|
| Title | 1966 terminal in a smoky office at dusk (hero image), plus a smoke layer |
| L1 | Room view (bg, mid, fg desk); focused paper close-up plate; DOCTOR printout prop; Dorothy at the doorway (silhouette or soft focus); ashtray, coffee and phone props |
| Era Jump | None. Built from typography, archival-style dates and grain |
| L2 | Room view (bg, mid, fg); monitor close-up plate; whiteboard close-up (we overlay the text ourselves) |
| L3 | Same office at night (bg, mid, fg); monitor close-up; DO NOT RELEASE binder; rainy window layer; server rack glow |
| Ending | Three eras' machines side by side; a modern chat-box glow |

- **Output format:** WebP/AVIF, ≤400KB per layer at 2560px wide, plus a mobile size.

### 10.4 Typography

- **1966:** Courier Prime for typed output. A mid-century grotesk for UI chrome and the title.
- **2018:** a coding monospace for the notebook. A system sans for the UI.
- **2019:** the original web-demo design, plus "fanfic archive" styling for the finale.
- Fonts: free (OFL) only.

---

## 11. Audio

### 11.1 Sound effects (from free-licensed libraries such as Freesound CC0, credited in CREDITS.md)

| Era | SFX |
|---|---|
| 1966 | Typeball strike (3–5 variations, randomized pitch), carriage return slam, line-feed ratchet, bell, motor hum loop, paper tear, room tone with distant typewriters, rotary phone ring, lighter flick, door knock |
| 2018 | Laptop and mechanical keyboard typing, Slack knock, fan hum, distant ping-pong, notification chime |
| 2019 | Rain on window, server hum, dramatic stings for derails, a "sparkle" shimmer for on-theme beats, heartbeat for low Coherence |
| UI | Placard pop, objective tick, Era Jump film-projector whir |

### 11.2 Music (generated with Suno)

| Cue | Description for generation (no artist names) |
|---|---|
| **Title theme** | 1960s cool jazz lounge, vibraphone lead, upright bass, brushed drums, smoky and sophisticated, instrumental |
| **L1 ambient** | Same theme played softly as if on a radio in the next room, with some lo-fi wobble |
| **Era Jump** | 60-second evolution from jazz to analog synth to 90s digital to lo-fi beats |
| **L2** | 2018 chill lo-fi hip-hop / indie electronic, optimistic, unobtrusive |
| **L3 boss** | Late-2000s moody alt-rock ballad, brooding piano, crashing drums, vampire-romance drama. **One vocal version with original parody lyrics** (draft: "Sparkle in the Weights"), plus an instrumental loop for the fight |
| **Finale** | The title jazz theme returns, reharmonized warmer |

**Licensing (checked in M0):**
- **Udio is out.** It disabled downloads on 2025-10-29, and its output is personal-use only on every plan.
- **Suno's free tier** is personal, non-commercial use, and Suno owns the output. Publishing tracks in a public game likely goes beyond that. **Paid plans** grant rights to songs downloaded while subscribed.
- **Plan:** generate all cues during one month of Suno Pro, or use CC0/CC-BY music instead (open item). ⚠️ Confirm against Suno's own terms before M5.

### 11.3 Voice (requested 2026-11-20)

- **Dorothy is voiced.** Every Dorothy line in the Level 1 finale gets a voice clip: a warm early-1960s Boston/mid-Atlantic secretary, slightly hushed when she asks for privacy. Lines stay on screen as captions.
- **Other voiced moments to consider:** the 1966 → 2018 newsreel narrator, and the 2019 "safety team" (optional).
- **Source:** decided during M5. Options are an AI voice tool, or a recording by a real person. Check the tool's terms for public use, as with music.
- Voice clips live in `public/audio/voice/` and play through the same audio system as the sound effects, with the same mute control.

### 11.4 Mixing

- A master volume control, plus separate music and SFX sliders.
- Mute is remembered.
- Audio starts only after the first user interaction, as browsers require.

---

## 12. Finale and shareability

- **Same prompt, three models:**
  - The player types one final prompt. The three machines answer side by side: ELIZA on paper, GPT-1 in the notebook, GPT-2 in the web demo.
  - This is the single most educational moment in the game.
- **Coda:** the screen goes dark. A modern chat box fades in, dated **November 30, 2022**, with a blinking cursor. *"To be continued."*
- **Certificate:**
  - A canvas-rendered PNG printed on teletype paper, downloadable and shareable.
  - It shows the player's name (optional), their team (Edward/Jacob), their best TL;DR line, and completion time.
  - Generated client-side; nothing is uploaded.
- **Open Graph image** and meta tags make the GitHub Pages link preview nicely.

## 13. Educational content

- Each placard is 3–4 sentences, plain language, with one "Then vs. Now" line.
- **Museum page:** every placard collected, plus a **Sources** list (the 1966 CACM paper, the GPT-1 and GPT-2 papers and blog posts, the ELIZAGEN project, the WebText description).
- **Accuracy rule:** every factual claim on a placard or in an Era Jump is sourced in `docs/SOURCES.md`. Parody is labeled as parody.

## 14. Accessibility

- Fully keyboard-playable. Visible focus states.
- **Readable mode:** swaps ink effects for crisp text and raises contrast.
- Captions for all spoken or important audio cues. Visual equivalents for sound-only feedback.
- **Reduced motion:** honors `prefers-reduced-motion` by turning off parallax, shake and the rain shader.
- Adjustable text size in the focused views.
- Screen-reader labels for the interfaces (the paper is mirrored to an ARIA live region).

## 15. Performance budgets

| Metric | Target |
|---|---|
| Time to title screen (desktop, cable) | < 3s |
| Initial download before play | ≤ 15MB |
| GPT-1 / GPT-2 124M downloads | 117MB / 128MB, background-prefetched, cached for return visits |
| Token streaming (WebGPU desktop) | ≥ 15 tokens/s |
| Token streaming (WASM desktop) | ≥ 4 tokens/s |
| Frame rate in scenes | 60fps desktop, 30fps mobile (effects scale down) |

## 16. Analytics (optional)

- Default: **none**.
- If wanted later: a privacy-friendly free counter (e.g., GoatCounter), with no cookies or personal data.
- Useful measures: level completion rates, skip rates per objective, and the share of Live vs. Archive Mode.

## 17. Budget

| Item | Cost |
|---|---|
| Hosting (GitHub Pages) | $0 |
| Model hosting (Hugging Face, GitHub fallback) | $0 |
| Model inference (player's own device) | $0 |
| Images (ChatGPT / Meta AI, existing access) | $0 incremental |
| Music (Suno) | $0 if already on a paid plan; otherwise about one month of Suno Pro, or $0 with CC0/CC-BY music |
| SFX and fonts (CC0 / OFL) | $0 |
| Custom domain (optional, later) | ~$12/year |

## 18. Milestones

| # | Milestone | Done when |
|---|---|---|
| **M0** | **Foundations and verification** | Public repo created; Pages deploys a "hello" build. Every ⚠️ item checked (model conversions, sizes, licenses, 2741 details, Suno terms). |
| **M1** | **ELIZA engine** ✅ 2026-11-20 | Port complete. Reproduces the 1966 sample conversation exactly in CI. |
| **M2** | **Level 1 playable (grey-box)** ✅ 2026-11-20 | Paper terminal with typing, printing and SFX. Objectives, placards, save. Placeholder art. |
| **M3** | **Model runtime** ✅ 2026-11-20 | Worker loads GPT-1 and GPT-2. Streaming, capability check, filters, Archive Mode with recorded outputs. |
| **M4** | **Levels 2 and 3 playable (grey-box)** | Notebook UI, web-demo and boss HUD. All objectives and beats detectable. Skips work. |
| **M5** | **Art and audio pass** | All images generated and layered. Music files generated (Suno) and wired in. Dorothy's voice lines recorded and wired in. SFX sourced. Era Jumps built. |
| **M6** | **Finale, polish, accessibility, performance** | Side-by-side finale, certificate, accessibility features, perf budgets met, mobile pass. |
| **M7** | **Launch** | README, credits, sources, OG image. Public link shared by the user. |

Grey-box first means the game is fun before it's pretty. The art pass then drops into finished layouts.

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| No browser-ready GPT-1 exists, and Transformers.js doesn't support its architecture (confirmed in M0) | M3 spike: custom ONNX export mimicking GPT-2's interface, then hand-written inference if needed. Worst case, GPT-1 runs Archive-only. |
| Model output is offensive | Generation blocklist, post-filter, auto re-roll, redaction gag. 13+ rating stated up front. |
| Objectives feel random or unfair because of sampling | Lenient detectors, re-roll button, skip after 3 tries, placard explains what *should* have happened. |
| Large downloads cause players to quit | Background prefetch during the previous level, honest size warnings, Archive Mode. |
| AI image generators get period details wrong | Reference photos, rejection checklist, our own crisp interface layer on top. |
| Music or image licensing ambiguity | Verify terms in M0, credit everything, keep the game non-commercial. |
| Twilight parody legal risk | Original parody text only, no copied passages or official art, parody labeled clearly, non-commercial. Character names used for commentary/parody. |
| Fidelity disputes from ELIZA purists | Cite sources and ship the fidelity test publicly in the repo. |

## 20. Open items

1. **Title.** "Mad Models" is a working title. Alternatives: *Prompt & Circumstance*, *Before the Chat*, *Ghost in the Teletype*.
2. **GitHub account/org and repo name** for the public repo.
3. **Player name** on the certificate: optional free-text field, or skip it?
4. **Sandbox mode** after completion: in v1 or later?
5. **Who presses "publish"** for asset generation sessions. Claude drives the browser, but each download batch is confirmed by the user.
6. **Music rights.** Is the Suno account on a paid plan? If not, pay for one month of Pro during M5, or use CC0/CC-BY music?

## 21. Out of scope (v1)

- Any model after GPT-2 (ChatGPT appears only as the coda tease).
- Multiplayer, leaderboards, accounts, or any server.
- Fine-tuning models.
- Native apps.
- Localization (English only).
