// A photoreal first-person room: one 3:2 photograph with clickable hotspots
// and small living effects (smoke, rain, glow), positioned in percentages of
// the photo so they stay aligned at any screen size. The frame covers the
// viewport; on narrow screens the room view scrolls sideways instead of
// cropping props away.

export interface Hotspot {
  id: string;
  label: string;
  /** Left, top, width, height as % of the photo. */
  box: [number, number, number, number];
}

export interface Effect {
  kind: 'smoke' | 'rain' | 'glow' | 'flicker';
  box: [number, number, number, number];
}

export interface PhotoSceneConfig {
  image: string;
  /** Where "sitting down" zooms to, as % of the photo. */
  focus: [number, number];
  hotspots: Hotspot[];
  effects?: Effect[];
  alt: string;
}

export class PhotoScene {
  readonly el: HTMLDivElement;
  private readonly frame: HTMLDivElement;
  private readonly cfg: PhotoSceneConfig;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private smokeStops: (() => void)[] = [];
  onHotspot: (id: string) => void = () => {};

  constructor(cfg: PhotoSceneConfig) {
    this.cfg = cfg;
    this.el = document.createElement('div');
    this.el.className = 'scene photo-scene room';
    this.frame = document.createElement('div');
    this.frame.className = 'photo-frame';
    this.frame.style.setProperty('--fx', `${cfg.focus[0]}%`);
    this.frame.style.setProperty('--fy', `${cfg.focus[1]}%`);
    this.frame.innerHTML = `<img class="photo" src="${cfg.image}" alt="${cfg.alt}" draggable="false" />`;

    for (const e of cfg.effects ?? []) {
      const fx = document.createElement(e.kind === 'smoke' ? 'canvas' : 'div');
      fx.className = `fx fx-${e.kind}`;
      place(fx, e.box);
      fx.setAttribute('aria-hidden', 'true');
      this.frame.appendChild(fx);
      if (e.kind === 'smoke' && !this.reduced) this.smokeStops.push(smoke(fx as HTMLCanvasElement));
    }
    for (const h of cfg.hotspots) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `hotspot hs-${h.id}`;
      b.setAttribute('aria-label', h.label);
      b.title = h.label;
      place(b, h.box);
      b.addEventListener('click', () => this.onHotspot(h.id));
      this.frame.appendChild(b);
    }
    const vignette = document.createElement('div');
    vignette.className = 'vignette';
    this.el.append(this.frame, vignette);

    if (!this.reduced) {
      this.el.addEventListener('pointermove', (e) => {
        if (this.el.classList.contains('focused')) return;
        const r = this.el.getBoundingClientRect();
        this.frame.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        this.frame.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    }
    // Start the sideways-scrolling room view centered on the focus point.
    requestAnimationFrame(() => this.centerOnFocus());
    window.addEventListener('resize', this.onResize);
  }

  private readonly onResize = () => this.centerOnFocus();

  private centerOnFocus(): void {
    const max = this.el.scrollWidth - this.el.clientWidth;
    if (max > 0) this.el.scrollLeft = Math.round(max * (this.cfg.focus[0] / 100));
  }

  setFocused(focused: boolean): void {
    this.el.classList.toggle('focused', focused);
    this.el.classList.toggle('room', !focused);
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('.hotspot')) b.tabIndex = focused ? -1 : 0;
  }

  setDim(dim: boolean): void {
    this.el.classList.toggle('dim', dim);
  }

  /** Swap the photo (e.g. the whiteboard changes at the end of 2018). */
  setImage(src: string): void {
    this.frame.querySelector<HTMLImageElement>('.photo')!.src = src;
  }

  /** Add an element positioned over the photo (e.g. handwriting on a whiteboard). */
  addOverlay(el: HTMLElement, box: [number, number, number, number]): void {
    el.classList.add('overlay-on-photo');
    place(el, box);
    this.frame.insertBefore(el, this.frame.querySelector('.hotspot'));
  }

  /** Crossfade to another photo of the same framing (e.g. Dorothy at the door). */
  crossfade(src: string): void {
    const img = this.frame.querySelector<HTMLImageElement>('.photo')!;
    const next = img.cloneNode() as HTMLImageElement;
    next.src = src;
    next.classList.add('incoming');
    img.after(next);
    next.addEventListener('load', () => {
      requestAnimationFrame(() => next.classList.add('in'));
      setTimeout(() => {
        img.remove();
        next.classList.remove('incoming', 'in');
      }, 1300);
    }, { once: true });
  }

  hotspotButton(id: string): HTMLButtonElement | null {
    return this.el.querySelector(`.hs-${id}`);
  }

  destroy(): void {
    this.smokeStops.forEach((s) => s());
    window.removeEventListener('resize', this.onResize);
  }
}

function place(el: HTMLElement, [l, t, w, h]: [number, number, number, number]): void {
  el.style.left = `${l}%`;
  el.style.top = `${t}%`;
  el.style.width = `${w}%`;
  el.style.height = `${h}%`;
}

/** A thin curl of cigarette smoke rising through the canvas. */
function smoke(canvas: HTMLCanvasElement): () => void {
  canvas.width = 120;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  const parts: { x: number; y: number; r: number; a: number; vx: number; vy: number; age: number }[] = [];
  let raf = 0;
  const step = (t: number) => {
    if (parts.length < 50 && Math.random() < 0.4) {
      parts.push({ x: canvas.width / 2, y: canvas.height - 4, r: 2, a: 0.2, vx: 0, vy: -0.5 - Math.random() * 0.3, age: 0 });
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age++;
      p.vx += Math.sin(t / 900 + p.age / 25) * 0.012;
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.1;
      p.a *= 0.989;
      if (p.y < -20 || p.a < 0.01) {
        parts.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(230, 225, 215, ${p.a})`);
      g.addColorStop(1, 'rgba(230, 225, 215, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
