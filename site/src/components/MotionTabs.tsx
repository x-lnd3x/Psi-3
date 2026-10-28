// Панель вкладок по образцу expo-motion-tabs (github.com/rit3zh/expo-motion-tabs), перенесённая на веб:
// одна стеклянная карточка внизу экрана. Нажатая вкладка раскрывает подпись,
// а карточка «перетекает» в панель раздела над вкладками. Панели сменяют друг друга
// со сдвигом в сторону нажатой вкладки и лёгким размытием. Тайминги и размеры взяты из оригинала.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, MotionConfig, type Variants } from 'motion/react';
import {
  House,
  UserCircle,
  Leaf,
  Article,
  ChatsCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  TelegramLogo,
  WhatsappLogo,
  Phone,
  ChatCircleDots,
  Sparkle,
} from '@phosphor-icons/react';

type TabId = 'home' | 'about' | 'services' | 'blog' | 'contacts';
type View = TabId | 'default';
type Link = { href: string; label: string };

interface Props {
  current: string | null;
  tabs: { id: TabId; label: string; title: string; href: string }[];
  t: { menu: string; open: string; close: string; book: string; soon: string; writeMe: string; allArticles: string; minRead: string; introTitle: string; introText: string };
  home: Link[];
  about: { name: string; role: string; stats: { value: number; label: string }[]; links: Link[] };
  prices: { label: string; value: string; featured?: boolean }[];
  posts: { href: string; title: string; tag: string; minutes: number }[];
  contacts: { telegram: string; telegramHandle: string; whatsapp: string; max: string | null; phone: string; phoneHref: string };
}

// Значения из src/motion-tabs/utils/constants.ts оригинала
const EASE = [0.22, 1, 0.36, 1] as const;
const DURATION = 0.6;
const TAB_H = 44;
const LABEL_PAD = 16;
const PANEL_SLIDE = 65;
const GAP = 2;
const PAD = 6;

const ICONS: Record<TabId, typeof House> = { home: House, about: UserCircle, services: Leaf, blog: Article, contacts: ChatsCircle };

export default function MotionTabs(props: Props) {
  const { current, tabs, t } = props;
  const [nav, setNav] = useState<{ view: View; prev: View; dir: number }>({ view: 'default', prev: 'default', dir: 0 });
  const [labelW, setLabelW] = useState<Record<string, number>>({});
  const [panelH, setPanelH] = useState<Record<string, number>>({});
  const [vw, setVw] = useState(1024);
  const measureRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const view = nav.view;
  const open = view !== 'default';
  const iconBox = vw < 400 ? 40 : TAB_H;
  const panelW = Math.min(vw - 24, 384);
  const pillKey: TabId | null = open ? (view as TabId) : ((tabs.find((x) => x.id === current)?.id ?? null) as TabId | null);

  // Подписи меряются заранее, чтобы ширина карточки и вкладки менялась синхронно, как в оригинале
  useLayoutEffect(() => {
    const measure = () => {
      const next: Record<string, number> = {};
      measureRef.current?.querySelectorAll<HTMLElement>('[data-label]').forEach((el) => {
        next[el.dataset.label!] = Math.ceil(el.getBoundingClientRect().width);
      });
      setLabelW(next);
      setVw(window.innerWidth);
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const next: Record<string, number> = {};
      for (const [k, el] of Object.entries(panelRefs.current)) if (el) next[k] = Math.ceil(el.offsetHeight);
      setPanelH(next);
    });
    Object.values(panelRefs.current).forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const index = (v: View) => tabs.findIndex((x) => x.id === v);
  function press(id: TabId) {
    setNav(({ view: v }) => {
      const next: View = v === id ? 'default' : id;
      const dir = v !== 'default' && next !== 'default' ? Math.sign(index(next) - index(v)) : 0;
      return { view: next, prev: v, dir };
    });
  }
  function close() {
    setNav(({ view: v }) => ({ view: 'default', prev: v, dir: 0 }));
  }
  function book() {
    close();
    window.dispatchEvent(new CustomEvent('open-booking'));
  }

  const label = (id: TabId) => labelW[id] ?? tabs.find((x) => x.id === id)!.label.length * 8;
  const toolbarW = (k: TabId | null) => PAD * 2 + tabs.length * iconBox + (tabs.length - 1) * GAP + (k ? label(k) + LABEL_PAD : 0);
  const barH = TAB_H + PAD * 2;
  // +2: рамка карточки по 1px с каждой стороны
  const cardW = (open ? Math.max(panelW, toolbarW(pillKey)) : toolbarW(pillKey)) + 2;
  const cardH = barH + 2 + (open ? 1 + (panelH[view] ?? 0) : 0);

  const panels: Record<TabId, ReactNode> = {
    home: <HomePanel {...props} onBook={book} />,
    about: <AboutPanel {...props} />,
    services: <ServicesPanel {...props} onBook={book} />,
    blog: <BlogPanel {...props} />,
    contacts: <ContactsPanel {...props} onBook={book} />,
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION, ease: EASE }}>
      <div className="pointer-events-none fixed inset-0 z-40">
        {open && <button type="button" aria-label={t.close} onClick={close} className="pointer-events-auto absolute inset-0 cursor-default" />}

        <div ref={measureRef} aria-hidden="true" className="invisible absolute -left-[9999px] top-0">
          {tabs.map((x) => (
            <span key={x.id} data-label={x.id} className="whitespace-nowrap text-sm font-semibold">
              {x.label}
            </span>
          ))}
        </div>

        <nav aria-label={t.menu} className="absolute inset-x-0 bottom-0 flex justify-center pb-[max(12px,env(safe-area-inset-bottom))]">
          <motion.div
            initial={false}
            animate={{ width: cardW, height: cardH }}
            className="pointer-events-auto relative flex flex-col justify-end overflow-hidden rounded-[28px] border border-line/80 bg-surface/80 shadow-[0_10px_32px_rgba(18,48,42,0.18)] backdrop-blur-2xl"
          >
            <div className="relative w-full flex-1 overflow-hidden">
              {tabs.map((x) => (
                <PanelLayer
                  key={x.id}
                  state={view === x.id ? 'in' : nav.prev === x.id ? 'out' : 'hidden'}
                  dir={nav.dir}
                  width={panelW}
                  label={x.title}
                  innerRef={(el) => {
                    panelRefs.current[x.id] = el;
                  }}
                >
                  <PanelHeader title={x.title} href={x.href} open={t.open} />
                  {panels[x.id]}
                </PanelLayer>
              ))}
            </div>
            <motion.div initial={false} animate={{ opacity: open ? 1 : 0 }} className="h-px w-full shrink-0 bg-line" />
            <ul className="flex shrink-0 items-center self-center" style={{ gap: GAP, padding: PAD }}>
              {tabs.map((x) => (
                <li key={x.id}>
                  <MorphTab
                    id={x.id}
                    label={x.label}
                    labelW={label(x.id)}
                    iconBox={iconBox}
                    active={pillKey === x.id}
                    expanded={view === x.id}
                    isPage={current === x.id}
                    onPress={() => press(x.id)}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        </nav>
      </div>
    </MotionConfig>
  );
}

// Вкладка: в покое только иконка, активная раскрывает подпись в «пилюле»
function MorphTab({ id, label, labelW, iconBox, active, expanded, isPage, onPress }: {
  id: TabId; label: string; labelW: number; iconBox: number; active: boolean; expanded: boolean; isPage: boolean; onPress: () => void;
}) {
  const [held, setHeld] = useState(false);
  const Icon = ICONS[id];
  const spring = { type: 'spring', stiffness: 500, damping: 26 } as const;
  return (
    <button
      type="button"
      onClick={onPress}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerLeave={() => setHeld(false)}
      aria-expanded={expanded}
      aria-current={isPage ? 'page' : undefined}
      aria-label={label}
      className="block rounded-full"
    >
      <motion.span
        initial={false}
        animate={{ width: iconBox + (active ? labelW + LABEL_PAD : 0), backgroundColor: active ? '#dcf1e8' : 'rgba(220,241,232,0)' }}
        className="relative flex items-center overflow-hidden rounded-full"
        style={{ height: TAB_H }}
      >
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ opacity: held ? (active ? 0.35 : 1) : 0, scale: held ? 1 : 0.68 }}
          transition={{ duration: held ? 0.14 : 0.22, ease: EASE }}
          className="absolute size-9 rounded-full bg-sage-tint"
          style={{ left: (iconBox - 36) / 2 }}
        />
        <motion.span
          initial={false}
          animate={{ y: held ? 1.5 : 0, scaleX: held ? 1.08 : 1, scaleY: held ? 0.76 : 1 }}
          transition={spring}
          className="relative grid shrink-0 place-items-center"
          style={{ width: iconBox, height: TAB_H }}
        >
          <motion.span initial={false} animate={{ opacity: active ? 0 : 1 }} className="absolute text-muted">
            <Icon size={22} />
          </motion.span>
          <motion.span initial={false} animate={{ opacity: active ? 1 : 0 }} className="absolute text-sage-deep">
            <Icon size={22} weight="fill" />
          </motion.span>
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: active ? 1 : 0, x: active ? 0 : -8 }}
          transition={{ duration: DURATION, ease: EASE, delay: active ? 0.12 : 0 }}
          className="relative whitespace-nowrap text-sm font-semibold text-sage-deep"
          style={{ paddingRight: LABEL_PAD }}
        >
          {label}
        </motion.span>
      </motion.span>
    </button>
  );
}

// Слой панели: входит со стороны нажатой вкладки и уходит в противоположную, с размытием
const panelVariants: Variants = {
  in: (dir: number) => ({
    opacity: [0, 1],
    x: [dir * PANEL_SLIDE, 0],
    scale: [0.97, 1],
    filter: ['blur(8px)', 'blur(0px)'],
    transition: { duration: DURATION - 0.08, ease: EASE },
  }),
  out: (dir: number) => ({
    opacity: 0,
    x: -dir * PANEL_SLIDE,
    scale: 0.97,
    filter: 'blur(8px)',
    transition: { duration: DURATION - 0.08, ease: EASE },
  }),
  hidden: { opacity: 0, transition: { duration: 0 } },
};

function PanelLayer({ state, dir, width, label, innerRef, children }: {
  state: 'in' | 'out' | 'hidden'; dir: number; width: number; label: string; innerRef: (el: HTMLDivElement | null) => void; children: ReactNode;
}) {
  return (
    <motion.div
      role="region"
      aria-label={label}
      inert={state !== 'in'}
      custom={dir}
      variants={panelVariants}
      initial="hidden"
      animate={state}
      className="absolute inset-x-0 top-0 mx-auto"
      style={{ width, pointerEvents: state === 'in' ? 'auto' : 'none' }}
    >
      <div ref={innerRef} className="flex max-h-[62dvh] flex-col gap-2 overflow-y-auto p-2.5">
        {children}
      </div>
    </motion.div>
  );
}

function PanelHeader({ title, href, open }: { title: string; href: string; open: string }) {
  return (
    <div className="flex items-center justify-between px-2 pt-1">
      <p className="text-base font-semibold text-ink">{title}</p>
      <a href={href} className="group flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-sm font-semibold text-sage-deep transition-colors duration-300 hover:bg-sage-tint">
        {open}
        <ArrowRight size={14} weight="bold" className="transition-transform duration-300 group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

function Row({ href, children, trailing, i }: { href: string; children: ReactNode; trailing?: ReactNode; i: number }) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-mist active:scale-[0.98]"
    >
      {children}
      <span className="ml-auto shrink-0 text-muted">{trailing ?? <ArrowRight size={16} />}</span>
    </motion.a>
  );
}

function BookButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-sage px-3 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-sage-deep active:scale-[0.98]"
    >
      <CalendarPlus size={18} weight="fill" />
      {label}
    </button>
  );
}

const Divider = () => <div className="mx-1.5 h-px bg-line opacity-60" />;

// Главная: карточка бесплатного знакомства (как «Continue listening» в примере оригинала) и быстрые ссылки
function HomePanel({ home, t, onBook }: Props & { onBook: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-sage p-3 text-white">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15">
          <Sparkle size={24} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{t.introTitle}</p>
          <p className="text-sm font-semibold">{t.introText}</p>
        </div>
        <button
          type="button"
          onClick={onBook}
          aria-label={t.book}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sage-deep transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          <CalendarPlus size={18} weight="fill" />
        </button>
      </div>
      <Divider />
      <div className="flex flex-col gap-0.5">
        {home.map((l, i) => (
          <Row key={l.href} href={l.href} i={i}>
            {l.label}
          </Row>
        ))}
      </div>
    </>
  );
}

function AboutPanel({ about }: Props) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl bg-sky-tint p-3">
        <svg width="48" height="48" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
          <rect width="32" height="32" rx="10" fill="#23805f" />
          <circle cx="12" cy="13" r="4" fill="#dcf1e8" />
          <circle cx="20.5" cy="13" r="4" fill="#def0fa" />
          <circle cx="16.25" cy="21" r="3" fill="#ffffff" />
        </svg>
        <div>
          <p className="text-base font-semibold text-ink">{about.name}</p>
          <p className="text-sm text-ink-soft">{about.role}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {about.stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-mist p-2">
            <p className="text-lg font-bold text-sage-deep">{s.value}</p>
            <p className="line-clamp-2 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <Divider />
      <div className="flex flex-col gap-0.5">
        {about.links.map((l, i) => (
          <Row key={l.href} href={l.href} i={i}>
            {l.label}
          </Row>
        ))}
      </div>
    </>
  );
}

function ServicesPanel({ prices, tabs, t, onBook }: Props & { onBook: () => void }) {
  const href = tabs.find((x) => x.id === 'services')!.href;
  return (
    <div className="flex flex-col gap-1">
      {prices.map((p, i) => (
        <motion.a
          key={p.label}
          href={href}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE }}
          className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 ${p.featured ? 'bg-sage-tint' : 'hover:bg-mist'}`}
        >
          <span className="text-sm text-ink-soft">{p.label}</span>
          <span className="shrink-0 text-sm font-semibold text-ink">{p.value}</span>
        </motion.a>
      ))}
      <BookButton label={t.book} onClick={onBook} />
    </div>
  );
}

function BlogPanel({ posts, t, tabs }: Props) {
  return (
    <>
      <div className="flex flex-col gap-0.5">
        {posts.map((p, i) => (
          <Row key={p.href} href={p.href} i={i} trailing={<ArrowUpRight size={16} />}>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="w-fit rounded-full bg-sky-tint px-2 py-0.5 text-xs font-semibold text-sky">{p.tag}</span>
              <span className="text-sm font-semibold text-ink">{p.title}</span>
              <span className="text-xs font-medium text-muted">
                {p.minutes} {t.minRead}
              </span>
            </span>
          </Row>
        ))}
      </div>
      <Divider />
      <Row href={tabs.find((x) => x.id === 'blog')!.href} i={posts.length}>
        {t.allArticles}
      </Row>
    </>
  );
}

function ContactsPanel({ contacts: c, t, onBook }: Props & { onBook: () => void }) {
  const tiles = [
    { href: c.telegram, label: 'Telegram', sub: c.telegramHandle, Icon: TelegramLogo, tone: 'bg-sky-tint text-sky' },
    { href: c.max, label: 'MAX', sub: c.max ? t.writeMe : t.soon, Icon: ChatCircleDots, tone: 'bg-sage-tint text-sage' },
    { href: c.whatsapp, label: 'WhatsApp', sub: c.phone, Icon: WhatsappLogo, tone: 'bg-sage-tint text-sage' },
    { href: c.phoneHref, label: c.phone, sub: '', Icon: Phone, tone: 'bg-sky-tint text-sky' },
  ];
  return (
    <>
      <p className="px-2 text-sm text-muted">{t.writeMe}</p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(({ href, label, sub, Icon, tone }, i) => {
          const inner = (
            <>
              <span className={`grid size-9 place-items-center rounded-lg ${tone}`}>
                <Icon size={20} weight="duotone" />
              </span>
              <span className="text-sm font-semibold text-ink">{label}</span>
              {sub && <span className="-mt-1.5 truncate text-xs text-muted">{sub}</span>}
            </>
          );
          const cls = 'flex h-full flex-col items-start gap-2 rounded-2xl bg-mist p-3';
          return (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.4, ease: EASE }}>
              {href ? (
                <a href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noopener" className={cls + ' transition-colors duration-300 hover:bg-sage-tint active:scale-[0.98]'}>
                  {inner}
                </a>
              ) : (
                <span aria-disabled="true" className={cls + ' opacity-60'}>
                  {inner}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <BookButton label={t.book} onClick={onBook} />
    </>
  );
}
