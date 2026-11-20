// Level 1 content: objectives, hints and placards. Facts are sourced in
// docs/SOURCES.md; the DOCTOR numbers are counted from the script itself.

import type { ElizaReply } from '../../engine/eliza';
import type { ObjectiveBase, Placard } from '../types';

export type { Placard };

export interface Objective extends ObjectiveBase {
  detect?: (reply: ElizaReply) => boolean;
}

export const OBJECTIVES: Objective[] = [
  {
    id: 'family',
    title: 'Mention the family.',
    hints: [
      'Every analyst gets around to Mother eventually.',
      'Tell it about someone in your family, and make them yours.',
      'Type: "My mother never listens to me."',
    ],
    explain: 'Saying "my mother" (or father, sister, brother...) fires a special rule that asks about your family.',
    detect: (r) => r.source === 'keyword' && !!r.decomposition?.some((p) => p.includes('/FAMILY')),
    placard: {
      id: 'keywords',
      kicker: 'How ELIZA works · 1 of 6',
      title: 'It is listening for keywords',
      body: [
        "ELIZA scans your sentence for words from its script, each with a rank. The DOCTOR script knows just 66 keywords.",
        'MOTHER, FATHER and SISTER are tagged FAMILY. When you say "my mother," a rule for MY spots the tag and asks about your family. ELIZA has no idea what a mother is.',
      ],
      thenNow: 'Then: a hand-written list of 66 words. Now: models learn associations from trillions of words of text.',
    },
  },
  {
    id: 'reflect',
    title: 'Make it talk back to you.',
    hints: [
      'A good listener repeats your words back to you, slightly rearranged.',
      'Say something about yourself using "I", "me" or "my", and see what comes back.',
      'Type: "I am tired of my job."',
    ],
    explain: 'ELIZA swaps I→YOU, MY→YOUR and AM→ARE, then pastes your own words into a template.',
    detect: (r) => r.source === 'keyword' && r.usedInput && r.substitutions.length > 0,
    placard: {
      id: 'reflection',
      kicker: 'How ELIZA works · 2 of 6',
      title: 'The listening is copy and paste',
      body: [
        'ELIZA swaps pronouns (I becomes YOU, MY becomes YOUR, AM becomes ARE), cuts your sentence into pieces with a pattern, and pastes the pieces into a reply template.',
        'The script holds 215 reply templates like WHY DO YOU SAY YOUR 3, where "3" means the third piece of your sentence.',
      ],
      thenNow: 'Then: your words, reflected. Now: models generate new sentences one word at a time.',
    },
  },
  {
    id: 'memory',
    title: 'Make it remember.',
    hints: [
      'It files away things that belong to you. Run out of things to say, and it may bring one back.',
      'Tell it about something of yours ("my..."). Later, type a few things with no keywords at all.',
      'Type "My dog ran away." Then type "Hmm." a few times.',
    ],
    explain: 'Anything you say with MY is filed away. On every fourth reply, if you give it no keywords, ELIZA replays one: "EARLIER YOU SAID YOUR...".',
    detect: (r) => r.source === 'memory',
    placard: {
      id: 'memory',
      kicker: 'How ELIZA works · 3 of 6',
      title: 'Its entire memory is a queue of sentences',
      body: [
        'When you say something with MY, ELIZA prepares a sentence like "EARLIER YOU SAID YOUR DOG RAN AWAY" and puts it in a queue.',
        'A counter cycles 1, 2, 3, 4. When it reaches 4 and your input has no keywords, ELIZA plays back the oldest memory. Weizenbaum\'s paper says the memory rule is picked at random; the recovered code shows it hashes your last word instead.',
      ],
      thenNow: 'Then: four memory templates. Now: models read the whole conversation every time they reply.',
    },
  },
  {
    id: 'stump',
    title: 'Stump the doctor.',
    hints: [
      'Say something it has no rule for.',
      'Avoid every word it might recognise. Try one plain word.',
      'Type: "Bananas."',
    ],
    explain: 'With no keyword to work with, ELIZA falls back on stock lines like PLEASE GO ON.',
    detect: (r) => r.source === 'none' || r.source === 'nomatch',
    placard: {
      id: 'none',
      kicker: 'How ELIZA works · 4 of 6',
      title: 'No keyword, no idea',
      body: [
        'When nothing in your sentence matches, ELIZA uses its NONE rule and cycles through four stock lines: I AM NOT SURE I UNDERSTAND YOU FULLY, PLEASE GO ON, WHAT DOES THAT SUGGEST TO YOU, and DO YOU FEEL STRONGLY ABOUT DISCUSSING SUCH THINGS.',
        'A therapist can get away with that. Weizenbaum picked the Rogerian therapist for DOCTOR because the role lets one side of the conversation pretend to know almost nothing about the world.',
      ],
      thenNow: 'Then: four stalling lines. Now: models always produce something, which brings its own problems.',
    },
  },
  {
    id: 'machine',
    title: 'Ask if it is a machine.',
    hints: [
      'Ask the doctor about its credentials.',
      'Mention computers or machines.',
      'Type: "Are you a computer?"',
    ],
    explain: 'COMPUTER and MACHINE are the highest-ranked keywords in the script, so that rule always wins.',
    detect: (r) => r.keywordsTried.includes('COMPUTER'),
    placard: {
      id: 'computer',
      kicker: 'How ELIZA works · 5 of 6',
      title: 'Even its self-awareness is a rule',
      body: [
        'COMPUTER, COMPUTERS, MACHINE and MACHINES carry the highest rank in the DOCTOR script: 50. Mention one and that rule beats everything else in the sentence.',
        'DO COMPUTERS WORRY YOU is not introspection. It is the first of six replies Weizenbaum wrote for anyone who asks.',
      ],
      thenNow: 'Then: one rule. Now: models are trained to describe what they are, which is a different trick.',
    },
  },
  {
    id: 'script',
    title: 'Read the script.',
    hints: [
      'The professor left his notes somewhere.',
      'Look around the desk.',
      'Lean back from the terminal and click the printout on the desk.',
    ],
    explain: 'The DOCTOR script on the desk is ELIZA\'s whole personality: keywords, patterns and replies.',
    placard: {
      id: 'script',
      kicker: 'How ELIZA works · 6 of 6',
      title: 'The whole personality fits on a few pages',
      body: [
        'Everything DOCTOR says comes from one script: 66 keywords, their patterns and 215 reply templates. Weizenbaum stressed that a script is data, not part of the program. Swap the script and ELIZA becomes someone else.',
        'The original program and script sat in Weizenbaum\'s papers at MIT until 2021. His estate released them to the public domain.',
      ],
      thenNow: 'Then: a few pages anyone can read. Now: billions of numbers nobody can read directly.',
    },
  },
];

export const ELIZA_EFFECT: Placard = {
  id: 'eliza-effect',
  kicker: 'The ELIZA effect',
  title: 'People confided in it anyway',
  body: [
    'Weizenbaum\'s secretary, who had watched him build ELIZA, asked him to leave the room so she could talk to it in private. Others wanted their sessions kept confidential.',
    'It disturbed him. He spent much of the rest of his career warning about it, most famously in Computer Power and Human Reason (1976). The tendency to read understanding into a machine\'s words still carries ELIZA\'s name.',
  ],
  thenNow: 'Then: a pattern-matcher on a typewriter. Now: the same instinct, pointed at far more convincing machines.',
};

export const PROMPTING_LESSON: Placard = {
  id: 'prompting-1966',
  kicker: 'Prompting in 1966',
  title: 'Prompting meant finding the trigger words',
  body: [
    'To get anything out of ELIZA you learned its keywords: say MY, mention MOTHER, ask about COMPUTERS. Nothing you said was understood; some of it was matched.',
    'Fifty-two years later, a very different machine would ask for a very different kind of prompt.',
  ],
};

/** The DOCTOR printout on the desk: a readable excerpt of the real script. */
export const SCRIPT_EXCERPT = `(HOW DO YOU DO.  PLEASE TELL ME YOUR PROBLEM)
START
(SORRY ((0) (PLEASE DON'T APOLIGIZE)
    (APOLOGIES ARE NOT NECESSARY) (WHAT FEELINGS
    DO YOU HAVE WHEN YOU APOLOGIZE) (I'VE TOLD YOU
    THAT APOLOGIES ARE NOT REQUIRED)))
(DONT = DON'T)
(REMEMBER 5 ((0 YOU REMEMBER 0) (DO YOU OFTEN
    THINK OF 4) (DOES THINKING OF 4 BRING ANYTHING
    ELSE TO MIND) ...
(MOTHER DLIST(/NOUN FAMILY))
(FATHER DLIST(/NOUN FAMILY))
(SISTER DLIST(/FAMILY))
(COMPUTER 50 ((0) (DO COMPUTERS WORRY YOU)
    (WHY DO YOU MENTION COMPUTERS) ...
(MY = YOUR 2 ((0 YOUR 0 (/FAMILY) 0)
    (TELL ME MORE ABOUT YOUR FAMILY)
    (WHO ELSE IN YOUR FAMILY 5) ...
(NONE ((0) (I AM NOT SURE I UNDERSTAND YOU FULLY)
    (PLEASE GO ON) (WHAT DOES THAT SUGGEST TO YOU)
    (DO YOU FEEL STRONGLY ABOUT DISCUSSING SUCH
    THINGS)))
(MEMORY MY (0 YOUR 0 = LETS DISCUSS FURTHER WHY
    YOUR 3) (0 YOUR 0 = EARLIER YOU SAID YOUR 3) ...`;

/** Stylized CTSS session start (⚠️ format approximated). */
export const LOGIN_SEQUENCE: { machine?: string; typed?: string; overstrike?: boolean }[] = [
  { machine: 'MIT8C0  CTSS   11/04/66  1412.2\n' },
  { typed: 'login t0109 2741' },
  { machine: 'W 1412.6\nPASSWORD\n' },
  { typed: 'XXXXXXXX', overstrike: true },
  { machine: 'T0109  2741  LOGGED IN  11/04/66  1413.0\nCTSS BEING USED IS MIT8C0\nREADY.\n' },
  { typed: 'r eliza' },
  { machine: 'W 1413.1\nEXECUTION.\n\n' },
];
