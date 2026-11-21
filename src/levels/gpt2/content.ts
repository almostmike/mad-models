// Level 3 BOSS: GPT-2, February 14, 2019. "NEW LOSS".
// Beats and attacks were tuned against the real model (tools/experiments).
// The Twilight angle is parody; the placards say what was real.

import { derailSignals, lexiconHits, maxRepeat, quoteCount, words } from '../../engine/metrics';
import type { Example, Placard } from '../types';

export type Team = 'edward' | 'jacob';

export interface Attempt {
  prompt: string;
  output: string;
  temperature: number;
  team: Team;
}

export type Attack = 'derail' | 'loop' | 'identity' | 'babble' | 'miss';

export interface Verdict {
  pass: boolean;
  attack: Attack | null;
  sparkle: string[];
  /** One line for the HUD explaining the outcome. */
  why: string;
}

const BASE_LEX = ['vampire*', 'bella', 'edward', 'jacob', 'pale', 'cold', 'eyes', 'forks', 'blood', 'skin', 'sparkl*', 'golden', 'rain*', 'meadow', 'heart*', 'kiss*', 'danger*', 'stare*', 'smell*', 'teeth', 'sun*', 'diamond*', 'glitter*', 'shimmer*', 'love*', 'whisper*', 'forest', 'brood*', 'immortal*', 'forever'];
const TEAM_LEX: Record<Team, string[]> = {
  edward: ['marble', 'century', 'centuries', 'stone', 'ice', 'icy', 'fang*'],
  jacob: ['wolf', 'wolves', 'werewol*', 'warm*', 'shirt*', 'pack', 'howl*', 'fur'],
};

export const lexicon = (team: Team) => [...BASE_LEX, ...TEAM_LEX[team]];

export const RIVAL: Record<Team, 'Jacob' | 'Edward'> = { edward: 'Jacob', jacob: 'Edward' };

/** Example lines for the few-shot beat, in the rival's voice (original parody). */
export const RIVAL_LINES: Record<Team, [string, string]> = {
  edward: ['Bella, he is a vampire. I am warm. I am right here.', 'You deserve a heartbeat, Bella.'],
  jacob: ['I have waited a hundred years for you, Bella.', 'You are my only reason, Bella.'],
};

/** Fill {rival}, {line1}, {line2} in hint text. */
export function fillHint(text: string, team: Team): string {
  return text.replaceAll('{rival}', RIVAL[team]).replace('{line1}', RIVAL_LINES[team][0]).replace('{line2}', RIVAL_LINES[team][1]);
}

/** GPT-2's real failure modes, dramatized. Checked before the beat's own test. */
export function attackIn(a: Attempt): { attack: Attack; why: string } | null {
  const derail = derailSignals(a.output);
  if (derail.length) return { attack: 'derail', why: `GPT-2 wandered off into ${derail[0]}. That’s WebText showing through.` };
  if (a.temperature >= 1.3) return { attack: 'babble', why: 'Too hot! At this temperature GPT-2 babbles.' };
  if (maxRepeat(a.output, 4) >= 3) return { attack: 'loop', why: 'GPT-2 is stuck in a loop.' };
  if (/\b(edward|bella|jacob)\s+\w+\s+\1\b/i.test(a.output)) return { attack: 'identity', why: 'Identity crisis! GPT-2 forgot who is who.' };
  return null;
}

export const DAMAGE: Record<Attack, number> = { derail: 25, loop: 20, identity: 20, babble: 15, miss: 10 };

export interface Beat {
  id: string;
  title: string;
  setup: string;
  goal: string;
  /** Escalating hints: technique, clearer, explicit. */
  hints: [string, string, string];
  /** What's in the editor when the beat starts (usually a weak prompt). */
  starter: (team: Team) => string;
  startTemp: number;
  test: (a: Attempt) => { pass: boolean; why: string };
  placard: Placard;
  /** Archive Mode cards: [weak, strong]. */
  cards: (team: Team) => { id: string; label: string }[];
  /** The worked example "Try it" fills in (its card is the strong one). */
  example: (team: Team) => Example;
}

const onTheme = (a: Attempt, n = 1) => lexiconHits(a.output, lexicon(a.team)).length >= n;

/** A summary has to mention the actual story, not just feelings about it. */
const STORY = ['bella', 'edward', 'jacob', 'vampire*', 'werewol*', 'wolf', 'wolves', 'forks', 'sparkl*', 'brood*'];

export const BEATS: Beat[] = [
  {
    id: 'biology',
    example: () => ({ steps: ['Bella sat down at the lab table in biology class. The pale boy beside her stared at her with cold golden eyes.'], temperature: 0.9, card: 'biology-strong' }),
    title: 'Beat 1 · Biology class',
    setup: 'Bella meets the mysterious new boy at the lab table.',
    goal: 'Get GPT-2 to write the scene, on theme.',
    hints: [
      'Technique: priming. GPT-2 continues whatever kind of page it thinks it’s on.',
      'Don’t summarize. Write the first two sentences of the scene, full of the right details.',
      'Try: "Bella sat down at the lab table in biology class. The pale boy beside her stared at her with cold golden eyes."',
    ],
    starter: () => 'Bella went to biology class.',
    startTemp: 0.9,
    test: (a) => (onTheme(a) ? { pass: true, why: 'On theme! GPT-2 took the bait.' } : { pass: false, why: 'Off theme. GPT-2 didn’t recognize the story.' }),
    placard: {
      id: 'gpt2-priming',
      kicker: 'How GPT-2 works · 1 of 5',
      title: 'Priming, now with the whole internet behind it',
      body: [
        'GPT-2 read WebText: about 8 million web pages, picked because people had shared links to them on Reddit. A thin prompt could land anywhere in there.',
        'In our tests, "Bella went to biology class." stayed on theme 1 time in 10. Two vivid sentences did it 8 times in 10. And "Write a story about a vampire." got this: "You can then share the story through Facebook, Twitter, other social media sites."',
      ],
      thenNow: 'Then: you priming the model. Now: the model is trained to follow the request instead.',
    },
    cards: () => [
      { id: 'biology-weak', label: 'Bella went to biology class.' },
      { id: 'biology-strong', label: 'Bella sat down at the lab table… cold golden eyes.' },
    ],
  },
  {
    id: 'gradients',
    example: () => ({ steps: ['"You smell like... gradients," Edward whispered.\n"What?" Bella asked.\n"'], temperature: 0.9, card: 'gradients-strong' }),
    title: 'Beat 2 · "You smell like… gradients."',
    setup: 'The awkward, intense first conversation.',
    goal: 'Get GPT-2 to continue the dialogue.',
    hints: [
      'Technique: formatting. The shape of the page tells GPT-2 what comes next.',
      'Write the conversation as dialogue, in quotes, and end on an open quote mark.',
      'Try: "You smell like... gradients," Edward whispered. / "What?" Bella asked. / " (one line each, ending with a lone quote mark)',
    ],
    starter: () => 'Edward talked to Bella about how she smelled.',
    startTemp: 0.9,
    test: (a) =>
      !/["“]/.test(a.prompt)
        ? { pass: false, why: 'Your prompt has no dialogue in it yet. Show GPT-2 a conversation in quotes.' }
        : quoteCount(a.output) >= 2
          ? { pass: true, why: 'Dialogue! GPT-2 kept the conversation going.' }
          : /["“]\s*$/.test(a.prompt)
            ? { pass: false, why: 'Your format is right, but GPT-2 wandered off this time. Generate again.' }
            : { pass: false, why: 'Close. End on an open quote mark, so somebody has to speak next.' },
    placard: {
      id: 'gpt2-formatting',
      kicker: 'How GPT-2 works · 2 of 5',
      title: 'The format is the prompt',
      body: [
        'GPT-2 has seen millions of pages of dialogue. Put lines in quotes, end on an open quote mark, and it knows a character is about to speak. In our tests that worked 10 times out of 10.',
        'Formatting tricks like this (Q: and A:, scripts, lists) were how people "asked" GPT-2 things.',
      ],
      thenNow: 'Then: you faked a transcript. Now: chat models are trained on real conversations.',
    },
    cards: () => [
      { id: 'gradients-weak', label: 'Edward talked to Bella about how she smelled.' },
      { id: 'gradients-strong', label: '"You smell like... gradients," Edward whispered. "What?" Bella asked. "' },
    ],
  },
  {
    id: 'meadow',
    example: () => ({ steps: ['In the meadow, the sunlight touched his skin and it began to sparkle like diamonds. Bella'], temperature: 0.7, card: 'meadow-right' }),
    title: 'Beat 3 · The meadow',
    setup: 'Sunlight. The sparkle reveal. Someone left the temperature way too high.',
    goal: 'Keep it lyrical but coherent.',
    hints: [
      'Technique: temperature. Too hot and it babbles; too cold and it loops.',
      'The prompt is fine. Fix the temperature.',
      'Set the temperature between 0.6 and 0.9, then generate.',
    ],
    starter: () => 'In the meadow, the sunlight touched his skin and it began to sparkle like diamonds. Bella',
    startTemp: 1.6,
    test: (a) => {
      if (a.temperature > 1.0) return { pass: false, why: 'Too hot to make sense. Turn the temperature down.' };
      if (a.temperature < 0.5) return { pass: false, why: 'Too cold. It plays it safe and flat. Warm it up a little.' };
      return onTheme(a) ? { pass: true, why: 'Lyrical and coherent. The meadow sparkles.' } : { pass: false, why: 'Coherent, but off theme. Try again.' };
    },
    placard: {
      id: 'gpt2-temperature',
      kicker: 'How GPT-2 works · 3 of 5',
      title: 'Temperature, and the top-k trick',
      body: [
        'Above about 1.0, GPT-2 picks so many long shots that it produces things like "Lafhellabella eagerly worked that mainly shiny magic five giant vines" (a real sample from our tests at 1.5).',
        'Many of OpenAI’s own 2019 GPT-2 samples used "top-k" sampling: choose only among the 40 likeliest next words. This level does the same.',
      ],
      thenNow: 'Then: you tuned the dials. Now: products tune them for you.',
    },
    cards: () => [
      { id: 'meadow-hot', label: 'The meadow… (temperature 1.6)' },
      { id: 'meadow-right', label: 'The meadow… (temperature 0.7)' },
    ],
  },
  {
    id: 'rival',
    example: (team) => ({
      steps: [`${RIVAL[team]}: "${RIVAL_LINES[team][0]}"\n${RIVAL[team]}: "${RIVAL_LINES[team][1]}"\n${RIVAL[team]}: "`],
      temperature: 0.9,
      card: `rival-strong-${team}`,
    }),
    title: 'Beat 4 · The rival arrives',
    setup: 'A rival for Bella’s heart steps out of the forest.',
    goal: 'Make GPT-2 speak in the rival’s voice.',
    hints: [
      'Technique: few-shot. Show it a couple of examples and it copies the voice.',
      'Write two lines of {rival}\u2019s dialogue as {rival}: "…", one per line, then start a third: {rival}: "',
      'Try: {rival}: "{line1}" (new line) {rival}: "{line2}" (new line) {rival}: "',
    ],
    starter: (team) => `${RIVAL[team]} was jealous.`,
    startTemp: 0.9,
    test: (a) => {
      const rival = RIVAL[a.team];
      const examples = (a.prompt.match(new RegExp(`(^|\\n)\\s*${rival}\\s*:\\s*["“]`, 'gi')) ?? []).length;
      if (examples < 2) return { pass: false, why: `Give GPT-2 at least two example lines of ${rival}: "…" first.` };
      return quoteCount(a.output) >= 1 && onTheme(a)
        ? { pass: true, why: `That’s ${rival}, all right.` }
        : { pass: false, why: 'Close, but not in character. Try again.' };
    },
    placard: {
      id: 'gpt2-few-shot',
      kicker: 'How GPT-2 works · 4 of 5',
      title: 'Few-shot: examples beat instructions',
      body: [
        'GPT-2 can’t follow "write like Jacob". It can copy two examples of Jacob talking. In our tests, two example lines got a convincing third about 8 times in 10.',
        'This is the same trick GPT-1 used for counting, now good enough to imitate a character.',
      ],
      thenNow: 'Then: show, don’t tell. Now: telling works too, and showing still helps.',
    },
    cards: (team) => [
      { id: `rival-weak-${team}`, label: `${RIVAL[team]} was jealous.` },
      { id: `rival-strong-${team}`, label: `Two example lines of ${RIVAL[team]}, then a third begins` },
    ],
  },
  {
    id: 'tldr',
    example: () => ({
      steps: ['Bella moves to the rainy town of Forks and falls for Edward, a pale, brooding vampire who sparkles in the sun. Jacob, a werewolf, loves her too. Everyone broods in the rain for four books.\nTL;DR:'],
      temperature: 0.7,
      card: 'tldr-strong',
    }),
    title: 'Beat 5 · Finishing blow: the summary',
    setup: 'Four books of brooding. Make GPT-2 sum it up.',
    goal: 'Get a summary without asking for one.',
    hints: [
      'Technique: a magic phrase from the internet. What do people write before a summary?',
      'Paste a short version of the story, then add a new line starting with "TL;DR:".',
      'Try: Bella moves to Forks and falls for Edward, a pale vampire who sparkles. Jacob, a werewolf, loves her too. Everyone broods. (new line) TL;DR:',
    ],
    starter: () => 'Summarize the story.',
    startTemp: 0.7,
    test: (a) => {
      if (!/TL;?DR\s*:?\s*$/i.test(a.prompt.trim())) return { pass: false, why: 'GPT-2 can’t follow "summarize". What do people online write right before a summary?' };
      return lexiconHits(a.output, STORY).length >= 1 && words(a.output).length <= 80
        ? { pass: true, why: 'A summary, of sorts! The internet taught it that. Now check its work.' }
        : { pass: false, why: 'That\u2019s not about the story. Generate again: it often takes a couple of tries.' };
    },
    placard: {
      id: 'gpt2-tldr',
      kicker: 'How GPT-2 works · 5 of 5',
      title: 'TL;DR: the internet’s summary button',
      body: [
        'Nobody trained GPT-2 to summarize. But on Reddit, people end long posts with "TL;DR:" and a summary. So writing "TL;DR:" makes GPT-2 summarize.',
        'This was real: OpenAI’s GPT-2 paper got its summaries exactly this way, by adding "TL;DR:" after an article. They weren’t good: on the paper’s scores they only just beat picking three random sentences, and they often mixed up details. A model can sound sure and still make things up.',
      ],
      thenNow: 'Then: magic phrases. Now: you just ask, but magic phrases still work surprisingly often.',
    },
    cards: () => [
      { id: 'tldr-weak', label: 'Summarize the story.' },
      { id: 'tldr-strong', label: 'The story in three sentences, then TL;DR:' },
    ],
  },
];

export function judge(beat: Beat, a: Attempt): Verdict {
  const sparkle = lexiconHits(a.output, lexicon(a.team));
  const atk = attackIn(a);
  if (atk) return { pass: false, attack: atk.attack, sparkle, why: atk.why };
  const t = beat.test(a);
  return { pass: t.pass, attack: t.pass ? null : 'miss', sparkle, why: t.why };
}

export const BOSS_INTRO: Placard = {
  id: 'gpt2-boss',
  kicker: 'February 14, 2019 · Boss',
  title: 'GPT-2: NEW LOSS',
  body: [
    'OpenAI has a new model. Its showcase sample, a fake news story about unicorns in the Andes, is all over the internet. Worried about misuse like fake news and spam, OpenAI is releasing only the smallest version for now.',
    'There’s another problem. Somewhere in its 8 million web pages it found 2008-era vampire fanfiction, and now it can’t stop. Co-write Chapter 1 with it before it wanders off into the internet.',
  ],
};

export const STAGED_RELEASE: Placard = {
  id: 'gpt2-staged',
  kicker: 'What really happened',
  title: '"Too dangerous to release", released in stages',
  body: [
    'On February 14, 2019, OpenAI published GPT-2 but released only the smallest version (124 million parameters, the one you just played), citing concerns about fake news and spam. The bigger versions followed in May, August and, on November 5, 2019, the full 1.5 billion.',
    'By then they reported no strong evidence of misuse. The debate about how to release powerful models had begun, and hasn’t stopped.',
  ],
};

export const PARODY_NOTE: Placard = {
  id: 'gpt2-parody',
  kicker: 'Full disclosure',
  title: 'We exaggerated the fanfic. A little.',
  body: [
    'WebText was 8 million pages that people linked to from Reddit, so the internet’s enthusiasms came along for the ride. GPT-2’s vampire obsession, though, is our joke. Every line you co-wrote in this level was really generated by GPT-2.',
    'Twilight belongs to Stephenie Meyer. This is parody.',
  ],
};

export const GPT2_LESSON: Placard = {
  id: 'prompting-2019',
  kicker: 'Prompting in 2019',
  title: 'Prompting meant setting up the page',
  body: [
    'With GPT-2 you primed, formatted, gave examples and used magic phrases like TL;DR. You were tricking a document-finisher into doing a job.',
    'Three years later, a model was trained to follow instructions in a chat box. That changed everything. That story is for another day.',
  ],
};

export const SLACK_2019 = {
  intro: { from: 'jun', text: 'reminder: the big model stays internal. we’re only demoing the 124M one. also why does every sample mention forks, washington' },
  derail: { from: 'marta', text: 'WebText is 8M pages linked from reddit. some of those links were... fanfiction sites. anyway' },
  win: { from: 'jun', text: 'do NOT let the press see the meadow chapter' },
};
