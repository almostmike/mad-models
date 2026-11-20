import { describe, expect, it } from 'vitest';
import { continuesNumbering, continuesSequence, derailSignals, distinctRatio, lexiconHits, maxRepeat, quoteCount } from './metrics';

describe('text metrics', () => {
  it('counts repeated phrases', () => {
    expect(maxRepeat('bella loved bella . bella loved bella . bella loved bella .', 3)).toBe(3);
    expect(maxRepeat('every word here is different from the others', 3)).toBe(1);
  });
  it('measures variety', () => {
    expect(distinctRatio('a a a a')).toBe(0.25);
  });
  it('finds lexicon words and stems', () => {
    expect(lexiconHits('His skin sparkled like the sea.', ['sparkl*', 'sea', 'vampire*']).sort()).toEqual(['sea', 'sparkl*']);
  });
  it('spots WebText debris', () => {
    expect(derailSignals('Share this story on Facebook and Twitter!')).toContain('social media');
    expect(derailSignals('Preheat the oven to 350.')).toContain('a recipe');
    expect(derailSignals('She looked at the rain.')).toEqual([]);
  });
  it('counts quotes', () => expect(quoteCount('"Hi," he said. “Bye.”')).toBe(4));
});

describe('pattern continuation (GPT-1 objective)', () => {
  it('numbered lists', () => {
    expect(continuesNumbering('1. apples\n2. bananas\n3. oranges\n4.', ' grapes\n5. pears')).toBe(true);
    expect(continuesNumbering('1. apples\n2. bananas\n3.', ' oranges, i said .')).toBe(false);
  });
  it('counting words, chapters, days', () => {
    expect(continuesSequence('one, two, three, four, five,', ' six , seven')).toBe(true);
    expect(continuesSequence('chapter one . chapter two . chapter three . chapter', ' four .')).toBe(true);
    expect(continuesSequence('monday, tuesday, wednesday,', ' thursday')).toBe(true);
    expect(continuesSequence('one, two, three,', ' banana')).toBe(false);
  });
  it('opposite pairs', () => {
    expect(continuesSequence('hot and cold. up and down. black and white. big and', ' small .')).toBe(true);
    expect(continuesSequence('hot and cold. big and', ' tall')).toBe(false);
  });
  it('needs an actual pattern in the prompt', () => {
    expect(continuesSequence('three', ' four')).toBe(false);
  });
});
