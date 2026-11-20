// The 1966 office, first person. Grey-box art built from CSS shapes; the
// final photoreal layers replace .wall and .desk in Milestone 5.

export type PropId = 'printout' | 'ashtray' | 'coffee' | 'phone' | 'door' | 'diploma' | 'terminal';

const PROPS: { id: PropId; label: string; layer: 'wall' | 'desk' }[] = [
  { id: 'door', label: 'Office door', layer: 'wall' },
  { id: 'diploma', label: 'Framed diploma', layer: 'wall' },
  { id: 'terminal', label: 'IBM 2741 terminal: sit down and type', layer: 'desk' },
  { id: 'printout', label: 'Printout on the desk', layer: 'desk' },
  { id: 'ashtray', label: 'Ashtray', layer: 'desk' },
  { id: 'coffee', label: 'Coffee cup', layer: 'desk' },
  { id: 'phone', label: 'Telephone', layer: 'desk' },
];

export class OfficeScene {
  readonly el: HTMLDivElement;
  onProp: (id: PropId) => void = () => {};
  private smoke: SmokeEffect | null = null;
  private readonly reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'scene room';
    this.el.innerHTML = `
      <div class="layer wall">
        <div class="window"><div class="blinds"></div></div>
        <div class="beam"></div>
        <div class="corkboard"><span>CTSS SCHEDULE<br>MON–FRI 0800–2400</span></div>
      </div>
      <div class="layer desk">
        <div class="desktop"></div>
        <div class="machine"><div class="platen"></div><div class="keys"></div><div class="paperstub"></div></div>
        <canvas class="smoke" width="120" height="260" aria-hidden="true"></canvas>
      </div>
      <div class="vignette"></div>`;

    for (const p of PROPS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `prop prop-${p.id}`;
      b.setAttribute('aria-label', p.label);
      b.title = p.label;
      b.innerHTML = '<span class="prop-art"></span>';
      b.addEventListener('click', () => this.onProp(p.id));
      this.el.querySelector(`.layer.${p.layer}`)!.appendChild(b);
    }

    if (!this.reduced) {
      this.el.addEventListener('pointermove', (e) => {
        const r = this.el.getBoundingClientRect();
        this.el.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        this.el.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      this.smoke = new SmokeEffect(this.el.querySelector('canvas')!);
    }
  }

  setFocused(focused: boolean): void {
    this.el.classList.toggle('focused', focused);
    this.el.classList.toggle('room', !focused);
    for (const b of this.el.querySelectorAll<HTMLButtonElement>('.prop')) b.tabIndex = focused ? -1 : 0;
  }

  setDim(dim: boolean): void {
    this.el.classList.toggle('dim', dim);
  }

  destroy(): void {
    this.smoke?.stop();
  }
}

/** A thin curl of cigarette smoke from the ashtray. */
class SmokeEffect {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly parts: { x: number; y: number; r: number; a: number; vx: number; vy: number; age: number }[] = [];
  private raf = 0;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    const loop = (t: number) => {
      this.step(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private step(t: number) {
    const { ctx, canvas } = this;
    if (this.parts.length < 46 && Math.random() < 0.35) {
      this.parts.push({ x: canvas.width / 2, y: canvas.height - 6, r: 2, a: 0.22, vx: 0, vy: -0.45 - Math.random() * 0.25, age: 0 });
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age++;
      p.vx += Math.sin((t / 900) + p.age / 25) * 0.012;
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.09;
      p.a *= 0.988;
      if (p.y < -20 || p.a < 0.01) {
        this.parts.splice(i, 1);
        continue;
      }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(225, 220, 210, ${p.a})`);
      g.addColorStop(1, 'rgba(225, 220, 210, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }
}
