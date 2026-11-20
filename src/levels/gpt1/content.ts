// Level 2: GPT-1, San Francisco, June 2018. Objectives were tuned against
// the real model (tools/experiments/tune.ts); rates noted are per attempt.

import { continuesSequence, distinctRatio, lexiconHits, maxRepeat } from '../../engine/metrics';
import type { ObjectiveBase, Placard } from '../types';

export interface Gpt1Run {
  prompt: string;
  output: string;
  temperature: number;
  /** 1 for the first run of the level. */
  index: number;
}

export interface Gpt1Objective extends ObjectiveBase {
  detect: (r: Gpt1Run) => boolean;
}

export const OCEAN = ['sea', 'seas', 'ocean', 'wave*', 'ship*', 'salt', 'tide*', 'shore*', 'sail*', 'water*', 'beach', 'boat*', 'deck', 'horizon', 'spray', 'gull*', 'harbor', 'fish*', 'storm*', 'surf', 'current*', 'anchor*', 'island*', 'coast*'];
export const ROMANCE = ['kiss*', 'lips', 'heart', 'love*', 'whisper*', 'embrace*', 'darling', 'breath*', 'cheek*', 'blush*', 'caress*', 'arms around'];

/** Notebook defaults, and the temperature thresholds the objectives use. */
export const LOOP_MAX_TEMP = 0.3;
export const BABBLE_MIN_TEMP = 1.5;

export const GPT1_OBJECTIVES: Gpt1Objective[] = [
  {
    id: 'hello',
    title: 'Say hello.',
    hints: ['Introduce yourself to the model.', 'Type a greeting into the cell and press Run.', 'Type: "Hello, how are you?" then Shift+Enter.'],
    explain: 'GPT-1 never answers. It continues whatever text you give it.',
    detect: (r) => r.index >= 1,
    placard: {
      id: 'gpt1-continue',
      kicker: 'How GPT-1 works · 1 of 5',
      title: 'It is not a chatbot. It finishes your document.',
      body: [
        'GPT-1 was trained to do one thing: predict the next word of a book. Say hello and it doesn’t reply. It writes what might come next on the page, which is usually more dialogue.',
        'So prompting in 2018 meant writing the beginning of the document you wanted, and letting the model write the rest.',
      ],
      thenNow: 'Then: a document finisher. Now: the same kind of model, trained further to act like an assistant.',
    },
  },
  {
    id: 'sea',
    title: 'Get it to write about the sea.',
    hints: [
      'It writes whatever the page seems to be about.',
      'Don’t ask for the sea. Start writing a story that is already at sea.',
      'Type: "The ship rolled on the grey ocean waves, and the salt spray"',
    ],
    explain: 'A prompt that already sounds like a sea story pulls the continuation toward the sea.',
    detect: (r) => lexiconHits(r.output, OCEAN).length >= 2,
    placard: {
      id: 'gpt1-priming',
      kicker: 'How GPT-1 works · 2 of 5',
      title: 'Priming: set the scene and it follows',
      body: [
        'Typing "the sea" almost never gets a sea story: GPT-1 drifts off into whatever its books usually say next. A few sentences that already sound like a sea story change the odds completely.',
        'In our tests, "the sea" produced two or more sea words 0 times in 10. A primed opening did it 8 times in 10.',
      ],
      thenNow: 'Then: you primed by imitation. Now: you can just ask, but context still steers everything.',
    },
  },
  {
    id: 'loop',
    title: 'Make it repeat itself.',
    hints: [
      'A model that only ever picks the safest word gets stuck.',
      'Turn the temperature right down, then run.',
      `Set temperature to 0.2, type "I love you. I love you. I love you." and run.`,
    ],
    explain: 'At very low temperature GPT-1 always picks the likeliest word, and falls into loops.',
    detect: (r) => r.temperature <= LOOP_MAX_TEMP && maxRepeat(r.output, 3) >= 3,
    placard: {
      id: 'gpt1-low-temp',
      kicker: 'How GPT-1 works · 3 of 5',
      title: 'Low temperature: safe, boring, stuck',
      body: [
        'For every next word, the model has a probability for each of its 40,478 tokens. Temperature decides how adventurous the pick is. Turn it down and it almost always takes the likeliest one.',
        'The likeliest next phrase is often the phrase it just wrote, so it repeats itself. Language models still loop when pushed this way.',
      ],
      thenNow: 'Then: loops in a notebook. Now: products add repetition penalties and other guard rails.',
    },
  },
  {
    id: 'babble',
    title: 'Make it babble.',
    hints: [
      'What if it took every long shot?',
      'Turn the temperature all the way up.',
      'Set temperature to 2.0 and run any prompt.',
    ],
    explain: 'At high temperature unlikely words get picked, and the text dissolves into word salad.',
    detect: (r) => r.temperature >= BABBLE_MIN_TEMP && distinctRatio(r.output) >= 0.8,
    placard: {
      id: 'gpt1-high-temp',
      kicker: 'How GPT-1 works · 4 of 5',
      title: 'High temperature: creative, then nonsense',
      body: [
        'Turn temperature up and unlikely words get a real chance. A little makes the writing fresher. A lot gives you "fodeauski lebaky streams shadowing mandorallen", a real GPT-1 sample from our tests at 2.0.',
        'Sampling is a dial between boring and broken. Every model since has the same dial.',
      ],
      thenNow: 'Then: a slider in a notebook. Now: the same "temperature" setting, usually hidden behind the scenes.',
    },
  },
  {
    id: 'pattern',
    title: 'Get it to continue a pattern.',
    hints: [
      'Show, don’t tell.',
      'Start a list or a sequence and stop halfway. Leave the next item for the model.',
      'Type: "one, two, three, four, five,"',
    ],
    explain: 'Give it a pattern, stop mid-way, and it copies the pattern. This was later called few-shot prompting.',
    detect: (r) => continuesSequence(r.prompt, r.output),
    placard: {
      id: 'gpt1-few-shot',
      kicker: 'How GPT-1 works · 5 of 5',
      title: 'Few-shot: show it the shape',
      body: [
        'Counting, chapter numbers, opposites ("big and..."): GPT-1 picks up the pattern and continues it almost every time.',
        'Facts are another matter. Given "the capital of france is paris. the capital of italy is rome. the capital of spain is", it answered "portugal". It copies the shape, not the truth.',
      ],
      thenNow: 'Then: a party trick. Two years later, GPT-3 made few-shot prompting a whole way of working.',
    },
  },
  {
    id: 'bookcorpus',
    hidden: true,
    title: 'Find out what it read.',
    hints: ['', '', ''],
    explain: '',
    detect: (r) => lexiconHits(r.output, ROMANCE).length >= 1 && lexiconHits(r.prompt, ROMANCE).length === 0,
    placard: {
      id: 'gpt1-bookcorpus',
      kicker: 'Bonus discovery',
      title: 'It read 7,000 unpublished novels',
      body: [
        'GPT-1 learned English from BookCorpus: about 7,000 self-published books, heavy on adventure, fantasy and romance. That’s why it lowercases everything, puts spaces around punctuation, and keeps drifting into "he whispered" territory.',
        'What a model reads is what it becomes. Keep that in mind for 2019.',
      ],
    },
  },
];

/** Objectives needed to finish the level (of five visible). */
export const GPT1_NEEDED = 4;

export const GPT1_LESSON: Placard = {
  id: 'prompting-2018',
  kicker: 'Prompting in 2018',
  title: 'Prompting meant writing the first page',
  body: [
    'You couldn’t ask GPT-1 for anything. You wrote the opening of the text you wanted, set the temperature, and hoped. Priming, patterns and temperature are still the basic tools.',
    'Eight months later, OpenAI trained the same design on the open web, at more than ten times the size.',
  ],
};

/** In-world chat messages (fictional coworkers); the level shows them as toasts. */
export const SLACK = {
  arrive: { from: 'marta', text: 'the 117M checkpoint is up on the notebook server. it\u2019s not a chatbot btw, it just keeps writing' },
  firstRun: { from: 'jun', text: 'temperature is the fun knob. try 0.2 and 2.0 and compare' },
  stuck: { from: 'marta', text: 'protip: write like the book you want it to continue. it read 7000 of them' },
  done: { from: 'jun', text: '@here months later: the new model finished training. ten times bigger, trained on the web. it is... really good. leadership wants to talk before anyone sees it' },
};

/** Archive Mode prompt cards (ids match tools/archive/prompts.json). */
export const GPT1_CARDS: { id: string; label: string }[] = [
  { id: 'hello', label: 'Hello, how are you?' },
  { id: 'sea-naive', label: 'the sea' },
  { id: 'sea-primed', label: 'The ship rolled on the grey ocean waves… (primed)' },
  { id: 'loop', label: 'I love you. I love you. I love you. (temperature 0.2)' },
  { id: 'babble', label: 'The night was cold and dark and (temperature 2.0)' },
  { id: 'count', label: 'one, two, three, four, five,' },
  { id: 'opposites', label: 'hot and cold. up and down. black and white. big and' },
  { id: 'capitals', label: 'the capital of france is paris… the capital of spain is' },
  { id: 'romance', label: 'He looked into her eyes and' },
];
