// Music (Suno, free plan, credited) and voice (ElevenLabs) files in public/audio.

const a = (p: string) => `${import.meta.env.BASE_URL}audio/${p}`;

export const MUSIC = {
  jazz1966: a('music/1966-jazz.mp3'),
  lofi2018: a('music/2018-lofi.mp3'),
  boss2019: a('music/2019-boss.mp3'),
};

export const VOICE = {
  dorothy1: a('voice/dorothy-1.mp3'),
  dorothy2: a('voice/dorothy-2.mp3'),
  dorothy3: a('voice/dorothy-3.mp3'),
};
