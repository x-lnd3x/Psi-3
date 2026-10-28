// Интерактивная «семейная система»: круги связаны пружинами.
// Если потянуть один круг, сдвигаются и связанные с ним, а потом всё возвращается в равновесие.
import { useEffect, useRef, useState } from 'react';
import { HandGrabbing } from '@phosphor-icons/react';

interface Props {
  labels: string[]; // Вы, Партнёр, Дети, Родители, Работа, Друзья
  hint: string;
}

const NODES = [
  { x: 150, y: 190, r: 46, fill: '#23805f', text: '#ffffff' },
  { x: 260, y: 190, r: 46, fill: '#2b78ad', text: '#ffffff' },
  { x: 205, y: 300, r: 36, fill: '#dcf1e8', text: '#17614a' },
  { x: 205, y: 78, r: 36, fill: '#def0fa', text: '#2f4f63' },
  { x: 58, y: 292, r: 30, fill: '#ffffff', text: '#35504a' },
  { x: 350, y: 292, r: 30, fill: '#ffffff', text: '#35504a' },
];
const EDGES: [number, number, number][] = [
  [0, 1, 3],
  [0, 2, 2],
  [1, 2, 2],
  [0, 3, 1.5],
  [1, 3, 1.5],
  [0, 4, 1.5],
  [1, 5, 1.5],
  [2, 3, 1],
  [4, 2, 1],
  [5, 2, 1],
];

export default function FamilySystem({ labels, hint }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pos = NODES.map((n) => ({ x: n.x, y: n.y, vx: 0, vy: 0 }));
    let drag: number | null = null;
    let target = { x: 0, y: 0 };
    let raf = 0;
    let visible = true;
    const start = performance.now();

    // Длина каждой связи в покое: та, что задана в начальной раскладке
    const rest = EDGES.map(([a, b]) => Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y));
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const resetIfBroken = () => {
      if (pos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return;
      pos.forEach((p, i) => Object.assign(p, { x: NODES[i].x, y: NODES[i].y, vx: 0, vy: 0 }));
    };

    function paint() {
      pos.forEach((p, i) => nodeRefs.current[i]?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`));
      EDGES.forEach(([a, b], i) => {
        const el = edgeRefs.current[i];
        if (!el) return;
        el.setAttribute('x1', pos[a].x.toFixed(1));
        el.setAttribute('y1', pos[a].y.toFixed(1));
        el.setAttribute('x2', pos[b].x.toFixed(1));
        el.setAttribute('y2', pos[b].y.toFixed(1));
      });
    }

    function tick(now: number) {
      const t = (now - start) / 1000;
      // Каждый круг держится за своё место слабой пружиной,
      // а связи тянут соседей за тем кругом, который сдвинули.
      const force = pos.map((p, i) => {
        const floatX = reduce ? 0 : Math.sin(t * 0.6 + i * 1.7) * 4;
        const floatY = reduce ? 0 : Math.cos(t * 0.5 + i * 1.3) * 4;
        return { x: (NODES[i].x + floatX - p.x) * 0.02, y: (NODES[i].y + floatY - p.y) * 0.02 };
      });
      EDGES.forEach(([a, b, w], i) => {
        const dx = pos[b].x - pos[a].x;
        const dy = pos[b].y - pos[a].y;
        const len = Math.hypot(dx, dy) || 1;
        const f = ((len - rest[i]) * 0.025 * w) / len;
        force[a].x += dx * f;
        force[a].y += dy * f;
        force[b].x -= dx * f;
        force[b].y -= dy * f;
      });
      pos.forEach((p, i) => {
        if (i === drag) {
          p.x += (target.x - p.x) * 0.35;
          p.y += (target.y - p.y) * 0.35;
          p.vx = p.vy = 0;
          return;
        }
        p.vx = clamp((p.vx + force[i].x) * 0.84, -24, 24);
        p.vy = clamp((p.vy + force[i].y) * 0.84, -24, 24);
        p.x = clamp(p.x + p.vx, 20, 380);
        p.y = clamp(p.y + p.vy, 20, 380);
      });
      resetIfBroken();
      paint();
      if (visible) raf = requestAnimationFrame(tick);
    }

    function toSvg(e: PointerEvent) {
      const ctm = svg!.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return { x: Math.max(30, Math.min(370, pt.x)), y: Math.max(30, Math.min(370, pt.y)) };
    }
    function onDown(e: PointerEvent) {
      const g = (e.target as Element).closest('[data-node]');
      if (!g) return;
      drag = Number(g.getAttribute('data-node'));
      target = toSvg(e);
      svg!.setPointerCapture(e.pointerId);
      setTouched(true);
    }
    function onMove(e: PointerEvent) {
      if (drag !== null) target = toSvg(e);
    }
    function onUp() {
      drag = null;
    }

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);

    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting;
      if (visible && !was) raf = requestAnimationFrame(tick);
    });
    io.observe(svg);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const linked = (i: number) => hover !== null && (EDGES[i][0] === hover || EDGES[i][1] === hover);

  return (
    <figure className="relative mx-auto w-full max-w-md select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 400 400"
        className="w-full touch-none overflow-visible"
        role="img"
        aria-label={hint}
      >
        <g className="origin-center animate-[spin_90s_linear_infinite] motion-reduce:animate-none" style={{ transformBox: 'fill-box' }}>
          <circle cx="205" cy="200" r="170" fill="none" stroke="#d3e5de" strokeDasharray="2 10" strokeWidth="2" />
        </g>
        <circle cx="205" cy="200" r="120" fill="none" stroke="#dcf1e8" strokeWidth="1.5" />
        {EDGES.map(([a, b, w], i) => (
          <line
            key={i}
            ref={(el) => {
              edgeRefs.current[i] = el;
            }}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            stroke={linked(i) ? '#23805f' : '#a9cfc0'}
            strokeWidth={linked(i) ? w + 1 : w}
            strokeLinecap="round"
            style={{ transition: 'stroke 300ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        ))}
        {NODES.map((n, i) => (
          <g
            key={i}
            data-node={i}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            transform={`translate(${n.x} ${n.y})`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle
              r={n.r}
              fill={n.fill}
              stroke={n.fill === '#ffffff' ? '#d3e5de' : 'none'}
              strokeWidth="1.5"
              style={{
                transform: hover === i ? 'scale(1.06)' : 'scale(1)',
                transition: 'transform 500ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill={n.text}
              fontSize={n.r > 40 ? 15 : 12}
              fontWeight={600}
              style={{ pointerEvents: 'none' }}
            >
              {labels[i]}
            </text>
          </g>
        ))}
      </svg>
      <figcaption
        className={`mt-2 flex items-center justify-center gap-2 text-sm text-muted transition-opacity duration-500 ${touched ? 'opacity-0' : 'opacity-100'}`}
      >
        <HandGrabbing size={18} weight="duotone" className="text-sage" />
        {hint}
      </figcaption>
    </figure>
  );
}
