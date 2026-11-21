import { describe, expect, it } from 'vitest';
import { BEATS } from './content';
import { straightQuotes } from './demo';
import { inventedWords, summaryOf } from './factcheck';

const story = 'Bella moves to the rainy town of Forks and falls for Edward, a pale, brooding vampire who sparkles in the sun. Jacob, a werewolf, loves her too.\nTL;DR:';

describe('fact-check', () => {
  it('finds words that are nowhere in the story', () => {
    expect(inventedWords(story, 'Bella is a vampire. Edward is a scientist.')).toEqual(['scientist']);
  });

  it('forgives plurals and other endings', () => {
    expect(inventedWords(story, 'Vampires sparkle. Werewolves love.')).toEqual([]);
  });

  it('keeps the summary short', () => {
    expect(summaryOf('One. Two. Three. Four.')).toBe('One. Two. Three.');
  });
});

describe('dialogue beat feedback', () => {
  const beat = BEATS.find((b) => b.id === 'gradients')!;
  const t = (prompt: string, output: string) => beat.test({ prompt, output, temperature: 0.9, team: 'edward' });

  it('tells a format problem from a model that wandered', () => {
    expect(t('Edward talked to Bella.', 'He did.').why).toMatch(/no dialogue in it yet/);
    expect(t('"Hi," he said.\n"', 'Click here to subscribe').why).toMatch(/wandered off/);
    expect(t('"Hi," he said.', 'Then he left.').why).toMatch(/open quote/);
    expect(t('"Hi," he said.\n"', 'What?" she asked. "Nothing."').pass).toBe(true);
  });

  it('straightens curly quotes before GPT-2 sees them', () => {
    expect(straightQuotes('“You smell like… gradients,” he whispered. It’s')).toBe('"You smell like… gradients," he whispered. It\'s');
  });
});
