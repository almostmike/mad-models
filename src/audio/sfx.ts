// Synthesized sound effects (Web Audio). Placeholders until recorded
// samples arrive in Milestone 5, but built to sound like the real thing:
// a Selectric typeball strike, carriage return, line-feed ratchet and bell.

interface Nodes {
  ctx: AudioContext;
  out: GainNode;
  noise: AudioBuffer;
}

export class Sfx {
  private nodes: Nodes | null = null;
  private hum: (() => void) | null = null;
  private _muted = false;
  onCaption: (text: string) => void = () => {};

  get muted(): boolean {
    return this._muted;
  }

  set muted(m: boolean) {
    this._muted = m;
    const n = this.nodes;
    if (n) n.out.gain.setTargetAtTime(m ? 0 : 0.8, n.ctx.currentTime, 0.02);
  }

  /** Call from a user gesture: browsers block audio until then. */
  unlock(): void {
    if (!this.nodes) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const out = ctx.createGain();
      out.gain.value = this._muted ? 0 : 0.8;
      out.connect(ctx.destination);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.nodes = { ctx, out, noise };
    }
    if (this.nodes.ctx.state === 'suspended') void this.nodes.ctx.resume();
  }

  /** Audio graph, if running. */
  private live(): Nodes | null {
    return this.nodes && this.nodes.ctx.state === 'running' ? this.nodes : null;
  }

  private burst(at: number, dur: number, type: BiquadFilterType, freq: number, q: number, gain: number) {
    const n = this.live();
    if (!n) return;
    const src = n.ctx.createBufferSource();
    src.buffer = n.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = n.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = n.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(n.out);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  private thump(at: number, freq: number, dur: number, gain: number) {
    const n = this.live();
    if (!n) return;
    const o = n.ctx.createOscillator();
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, at + dur);
    const g = n.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(n.out);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private now(): number {
    return this.nodes?.ctx.currentTime ?? 0;
  }

  /** The typeball striking the platen. */
  strike(): void {
    const t = this.now();
    const v = 0.85 + Math.random() * 0.3;
    this.burst(t, 0.035, 'bandpass', 2600 + Math.random() * 900, 1.4, 0.55 * v);
    this.thump(t, 140 + Math.random() * 30, 0.05, 0.35 * v);
    this.burst(t + 0.012, 0.03, 'highpass', 5000, 0.7, 0.12 * v);
  }

  /** The space bar: escapement only, no strike. */
  space(): void {
    this.burst(this.now(), 0.025, 'bandpass', 1800, 2, 0.18);
  }

  /** A key going down on the 2741 keyboard (the strike follows). */
  key(): void {
    this.burst(this.now(), 0.02, 'bandpass', 1400 + Math.random() * 400, 2, 0.15);
    this.strike();
  }

  /** Carriage return: the carrier whooshes back and slams. */
  carriageReturn(): void {
    const n = this.live();
    if (!n) return;
    const t = n.ctx.currentTime;
    const src = n.ctx.createBufferSource();
    src.buffer = n.noise;
    const f = n.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.9;
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.22);
    const g = n.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    src.connect(f).connect(g).connect(n.out);
    src.start(t);
    src.stop(t + 0.3);
    this.thump(t + 0.25, 95, 0.12, 0.6);
    this.burst(t + 0.25, 0.06, 'lowpass', 900, 1, 0.5);
    this.lineFeed(t + 0.28);
  }

  /** Platen ratchet advancing the paper one line. */
  lineFeed(at = this.now()): void {
    for (let i = 0; i < 3; i++) this.burst(at + i * 0.018, 0.012, 'highpass', 3500, 1, 0.12);
  }

  /** The terminal bell. */
  bell(): void {
    this.onCaption('[bell]');
    const n = this.live();
    if (!n) return;
    const t = n.ctx.currentTime;
    for (const [freq, gain] of [[1760, 0.28], [2640, 0.12], [4180, 0.06]] as const) {
      const o = n.ctx.createOscillator();
      o.frequency.value = freq;
      const g = n.ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g).connect(n.out);
      o.start(t);
      o.stop(t + 1.5);
    }
  }

  /** Two knocks on a wooden door. */
  knock(): void {
    this.onCaption('[knock at the door]');
    const t = this.now();
    for (const dt of [0, 0.22]) {
      this.thump(t + dt, 110, 0.12, 0.7);
      this.burst(t + dt, 0.05, 'lowpass', 600, 1, 0.5);
    }
  }

  /** Tearing the printout off the terminal. */
  tear(): void {
    this.onCaption('[paper tears]');
    const t = this.now();
    for (let i = 0; i < 14; i++) this.burst(t + i * 0.025 + Math.random() * 0.01, 0.04, 'highpass', 2500, 0.8, 0.2);
  }

  /** A chat-app notification: two soft rising notes. */
  chime(): void {
    const n = this.live();
    if (!n) return;
    const t = n.ctx.currentTime;
    [[880, 0], [1320, 0.09]].forEach(([freq, dt]) => {
      const o = n.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq;
      const g = n.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.12, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.35);
      o.connect(g).connect(n.out);
      o.start(t + dt);
      o.stop(t + dt + 0.4);
    });
  }

  /** Laptop keyboard: a light plastic tick. */
  tap(): void {
    this.burst(this.now(), 0.018, 'bandpass', 3200 + Math.random() * 800, 1.6, 0.12);
  }

  /** A short sting for GPT-2's attacks. */
  sting(): void {
    const n = this.live();
    if (!n) return;
    const t = n.ctx.currentTime;
    const o = n.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.4);
    const f = n.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    const g = n.ctx.createGain();
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(g).connect(n.out);
    o.start(t);
    o.stop(t + 0.55);
  }

  /** A rising shimmer for on-theme writing. */
  sparkle(): void {
    const n = this.live();
    if (!n) return;
    const t = n.ctx.currentTime;
    [1568, 2093, 2637, 3136].forEach((freq, i) => {
      const o = n.ctx.createOscillator();
      o.frequency.value = freq;
      const g = n.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.5);
      o.connect(g).connect(n.out);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.55);
    });
  }

  // ---------- music and voice ----------

  private music: { el: HTMLAudioElement; gain: GainNode; src: string } | null = null;
  private musicLevel = 0.32;

  /**
   * Crossfade to a looping music track. "radio" muffles it, as if playing
   * on a radio in the next room (1966).
   */
  playMusic(src: string, opts: { radio?: boolean; level?: number } = {}): void {
    const n = this.nodes;
    if (!n) return;
    const key = `${src}|${opts.radio ? 'radio' : 'clear'}`;
    if (this.music?.src === key) return;
    this.stopMusic(1.5);
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'auto';
    const source = n.ctx.createMediaElementSource(el);
    const gain = n.ctx.createGain();
    gain.gain.value = 0.0001;
    let chain: AudioNode = source;
    if (opts.radio) {
      const lp = n.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      const hp = n.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 280;
      chain.connect(hp);
      hp.connect(lp);
      chain = lp;
    }
    chain.connect(gain).connect(n.out);
    const level = opts.level ?? (opts.radio ? 0.22 : this.musicLevel);
    void el.play().then(
      () => gain.gain.exponentialRampToValueAtTime(level, n.ctx.currentTime + 2),
      () => undefined,
    );
    this.music = { el, gain, src: key };
  }

  stopMusic(fade = 1.2): void {
    const m = this.music;
    const n = this.nodes;
    this.music = null;
    if (!m || !n) return;
    m.gain.gain.cancelScheduledValues(n.ctx.currentTime);
    m.gain.gain.setValueAtTime(Math.max(0.0001, m.gain.gain.value), n.ctx.currentTime);
    m.gain.gain.exponentialRampToValueAtTime(0.0001, n.ctx.currentTime + fade);
    setTimeout(() => m.el.pause(), fade * 1000 + 100);
  }

  /** Play a voice line (ducking the music); resolves when it ends. */
  playVoice(src: string): Promise<void> {
    const n = this.nodes;
    if (!n || this._muted) return Promise.resolve();
    const el = new Audio(src);
    const source = n.ctx.createMediaElementSource(el);
    const gain = n.ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(n.out);
    const m = this.music;
    const t = n.ctx.currentTime;
    const prev = m ? m.gain.gain.value : 0;
    if (m) m.gain.gain.setTargetAtTime(Math.max(0.0001, prev * 0.35), t, 0.15);
    return new Promise((resolve) => {
      const done = () => {
        if (m && this.music === m) m.gain.gain.setTargetAtTime(prev, n.ctx.currentTime, 0.4);
        resolve();
      };
      el.addEventListener('ended', done, { once: true });
      el.addEventListener('error', done, { once: true });
      void el.play().catch(done);
    });
  }

  /** Low motor hum while the terminal is on. */
  startHum(): void {
    const n = this.live();
    if (this.hum || !n) return;
    const g = n.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.035, n.ctx.currentTime + 1.5);
    const oscs = [60, 120, 180].map((freq, i) => {
      const o = n.ctx.createOscillator();
      o.frequency.value = freq;
      const og = n.ctx.createGain();
      og.gain.value = [1, 0.5, 0.2][i];
      o.connect(og).connect(g);
      o.start();
      return o;
    });
    g.connect(n.out);
    this.hum = () => {
      g.gain.exponentialRampToValueAtTime(0.0001, n.ctx.currentTime + 0.8);
      oscs.forEach((o) => o.stop(n.ctx.currentTime + 0.9));
    };
  }

  stopHum(): void {
    this.hum?.();
    this.hum = null;
  }
}

export const sfx = new Sfx();
