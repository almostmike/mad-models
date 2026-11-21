# Sources

The accuracy rule (PRD §13): every factual claim on a placard or in a newsreel is sourced here. Parody is labeled as parody.

Figures that start with "in our tests" come from this project's own runs of the real models. Those measurements are in [VERIFICATION.md](VERIFICATION.md).

Checked on 2026-11-20.

## Primary sources

| Source | Used for |
|---|---|
| J. Weizenbaum, "ELIZA — A Computer Program for the Study of Natural Language Communication Between Man and Machine," *Communications of the ACM* 9(1), January 1966. [doi:10.1145/365153.365168](https://doi.org/10.1145/365153.365168) | How ELIZA works, the DOCTOR script, the Rogerian-therapist rationale |
| J. Weizenbaum, *Computer Power and Human Reason* (1976). [Wikipedia summary](https://en.wikipedia.org/wiki/Computer_Power_and_Human_Reason) | The secretary anecdote, Weizenbaum's warnings |
| ELIZAGEN, [Joseph Weizenbaum's Original ELIZA](https://sites.google.com/view/elizagen-org/original-eliza) | Recovery of the original source in 2021; the estate's CC0 release |
| Lane, Hay, Schwarz, Berry, Shrager, [ELIZA Reanimated (arXiv 2501.06707)](https://arxiv.org/abs/2501.06707) | ELIZA on CTSS on the IBM 7094; Project MAC |
| A. Hay, [anthay/ELIZA](https://github.com/anthay/ELIZA) and ["A certain counting mechanism"](https://sites.google.com/view/elizaarchaeology/blog/1-a-certain-counting-mechanism) | The engine this game ports; the memory hash vs. the paper's "random" |
| V. Cerf, [RFC 439: PARRY Encounters the DOCTOR](https://www.rfc-editor.org/rfc/rfc439) | PARRY talking to DOCTOR over the ARPANET (session of 18 Sept 1972) |
| Radford et al., [Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) (2018) and OpenAI, [Improving language understanding with unsupervised learning](https://openai.com/index/language-unsupervised/) (June 11, 2018) | GPT-1: BookCorpus, 12 layers, 512-token context, 117M parameters |
| Hugging Face, [openai-community/openai-gpt](https://huggingface.co/openai-community/openai-gpt) | GPT-1's 40,478-token vocabulary and lowercased, punctuation-split text |
| Zhu et al., [Aligning Books and Movies (arXiv 1506.06724)](https://arxiv.org/abs/1506.06724) and [BookCorpus (Wikipedia)](https://en.wikipedia.org/wiki/BookCorpus) | BookCorpus: about 7,000 books from Smashwords. The GPT-1 paper calls them "unpublished", but they were free self-published e-books, which is why the game says "self-published" |
| OpenAI, [Better Language Models and Their Implications](https://openai.com/index/better-language-models/) (February 14, 2019) | The GPT-2 announcement, the unicorn sample, holding back the full model |
| Radford et al., [Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) (2019) | WebText (about 8 million documents from Reddit outbound links with 3+ karma), 1.5B parameters, the TL;DR summarization trick |
| OpenAI, [GPT-2: 1.5B release](https://openai.com/index/gpt-2-1-5b-release/) (November 5, 2019) and Solaiman et al., [Release Strategies and the Social Impacts of Language Models (arXiv 1908.09203)](https://arxiv.org/abs/1908.09203) | The staged release (124M in February, 355M in May, 774M in August, 1.5B on November 5) and "no strong evidence of misuse" |
| OpenAI, [gpt-2-output-dataset](https://github.com/openai/gpt-2-output-dataset) and [gpt-2](https://github.com/openai/gpt-2) | OpenAI's own GPT-2 samples made with top-k 40; the 124M name (first reported as 117M) |
| Brown et al., [Language Models are Few-Shot Learners (arXiv 2005.14165)](https://arxiv.org/abs/2005.14165) (2020) | GPT-3 and few-shot prompting |
| OpenAI, [Introducing ChatGPT](https://openai.com/index/chatgpt/) (November 30, 2022) | The coda's date |

## Claims, where they appear

### 1966 (Level 1 placards)

| Claim | Source |
|---|---|
| DOCTOR has 66 keywords (plus a NONE fallback rule) and 215 reply templates | Counted from the script in `src/engine/eliza/doctor-1966.ts` (CACM appendix) |
| MOTHER, FATHER, SISTER are tagged FAMILY; MY's rule checks the tag | CACM 1966 appendix |
| Pronoun swaps (I→YOU, MY→YOUR, AM→ARE); decomposition and reassembly | CACM 1966 |
| Memory: MY sentences queued; recalled when a counter reaches 4 and the input has no keyword; the paper says "random", the code hashes the last word | CACM 1966; Hay, "A certain counting mechanism"; anthay/ELIZA |
| Four NONE lines | CACM 1966 appendix |
| COMPUTER/MACHINE rank 50, the highest; DO COMPUTERS WORRY YOU is the first of six replies | CACM 1966 appendix |
| Weizenbaum chose the Rogerian therapist because that role can pretend to know almost nothing of the real world | CACM 1966 |
| The original program and script were found in Weizenbaum's MIT papers in 2021, and the estate released them under CC0 | ELIZAGEN; ELIZA Reanimated |
| The secretary asked him to leave the room; others wanted sessions kept private; it disturbed him | *Computer Power and Human Reason*; [IEEE Spectrum](https://spectrum.ieee.org/why-people-demanded-privacy-to-confide-in-the-worlds-first-chatbot) |
| Project MAC at 545 Technology Square; CTSS on an IBM 7094; IBM 2741 terminals | ELIZA Reanimated; [IBM 2741 (Wikipedia)](https://en.wikipedia.org/wiki/IBM_2741) |
| 1966 → 2018 is 52 years | Arithmetic |

### Newsreel: 1966 → 2018

| Claim | Source |
|---|---|
| 1970: SHRDLU at MIT (Terry Winograd, 1968–70) | [SHRDLU (Wikipedia)](https://en.wikipedia.org/wiki/SHRDLU) |
| 1972: PARRY talks to DOCTOR over the ARPANET | RFC 439 (session 18 Sept 1972) |
| 1973: the Lighthill Report; funding cuts and the first AI winter | [Lighthill report (Wikipedia)](https://en.wikipedia.org/wiki/Lighthill_report); [AI winter](https://en.wikipedia.org/wiki/AI_winter) |
| 1987: the expert-systems and Lisp-machine bust; the second AI winter | [AI winter (Wikipedia)](https://en.wikipedia.org/wiki/AI_winter) |
| 1997: Deep Blue beats Kasparov | [Deep Blue versus Garry Kasparov (Wikipedia)](https://en.wikipedia.org/wiki/Deep_Blue_versus_Garry_Kasparov) |
| 2012: AlexNet wins ImageNet by a wide margin | [AlexNet (Wikipedia)](https://en.wikipedia.org/wiki/AlexNet) |
| 2017: "Attention Is All You Need", eight authors, mostly at Google | [arXiv 1706.03762](https://arxiv.org/abs/1706.03762) |
| June 2018: a Transformer trained on about 7,000 self-published novels | GPT-1 paper and blog; BookCorpus |

### 2018 (Level 2 placards)

| Claim | Source |
|---|---|
| GPT-1 was pre-trained to predict the next word of books | GPT-1 paper |
| The plan was to fine-tune it for language tasks; the notebook is the raw pretrained model | GPT-1 paper and blog |
| 40,478 tokens in its vocabulary | Hugging Face config for openai-gpt |
| "the sea" vs. a primed opening; GPT-1's "portugal" and the 2.0-temperature babble sample | In our tests (VERIFICATION.md, Archive Mode recordings) |
| BookCorpus: about 7,000 books, heavy on adventure, fantasy and romance; lowercased and split at punctuation before training | GPT-1 paper; BookCorpus; openai-gpt tokenizer |
| GPT-3, two years later, made few-shot prompting a way of working | GPT-3 paper (May 2020) |
| Eight months later, the same design on web text at more than ten times the size | GPT-2 blog (Feb 2019); 1.5B vs. 117M |
| The hoodie caption: NIPS renamed itself NeurIPS in November 2018 | [NeurIPS (Wikipedia)](https://en.wikipedia.org/wiki/Conference_on_Neural_Information_Processing_Systems) |

### Newsreel: 2018 → 2019

| Claim | Source |
|---|---|
| October 2018: Google's BERT, bidirectional, tops benchmarks | [arXiv 1810.04805](https://arxiv.org/abs/1810.04805) |
| February 14, 2019: GPT-2, more than ten times bigger, trained on 8 million web pages | GPT-2 blog and paper |
| OpenAI held back the full model citing misuse concerns; headlines said "too dangerous to release" | GPT-2 blog; press coverage summarized in [GPT-2 (Wikipedia)](https://en.wikipedia.org/wiki/GPT-2) |

### 2019 (Level 3 placards)

| Claim | Source |
|---|---|
| WebText: about 8 million pages that Reddit users linked to | GPT-2 paper |
| The unicorn news story | GPT-2 blog |
| Top-k sampling with k = 40 in OpenAI's own samples | gpt-2-output-dataset; gpt-2 README |
| Summaries by appending "TL;DR:" were OpenAI's own method in the paper | GPT-2 paper, section 3.6 |
| Those summaries only just beat picking three random sentences on the paper's scores, and often mixed up details | GPT-2 paper, section 3.6 |
| The unicorn story was a showcase sample; the full model was held back over misuse concerns (fake news, spam, impersonation) | GPT-2 blog |
| Staged release dates and sizes; 124M is the size you play; "no strong evidence of misuse" | GPT-2 1.5B release post; Release Strategies report |
| Weak vs. strong prompt success rates; GPT-2's babble and "share the story through Facebook" samples | In our tests (VERIFICATION.md) |

### Finale and coda

| Claim | Source |
|---|---|
| Every answer in the finale is real ELIZA, GPT-1 or GPT-2 output (live, or recorded in Archive Mode) | `tools/archive/record.ts`; `public/archive/*.json` |
| November 30, 2022: a chat model trained to follow instructions | Introducing ChatGPT |

## What's made up

- **Dorothy** is a fictional stand-in for Weizenbaum's secretary, who is unnamed in his account. Her voice is AI-generated.
- **The setting:** Professor Weizenbaum being away at a conference, the coffee cup, the phone extension and the login timestamp are invented. The CTSS login text is approximated.
- **The 2018 startup** and its coworkers (marta and jun) are fictional. It is not a depiction of OpenAI's office or staff.
- **The binder** "DO NOT RELEASE" is fiction. The release plan written in it matches what really happened.
- **GPT-2's vampire obsession is parody.** WebText did come from links shared on Reddit, but the Twilight fixation is our joke, and the game says so on a placard. Every GPT-2 line in the level is real model output. Twilight belongs to Stephenie Meyer.
- **Karl the Fog** and the LaCroix are scenery.
