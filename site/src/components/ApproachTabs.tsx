// Вкладки «Для пары / Для семьи / Для себя» с перетекающей плашкой
import { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { CheckCircle, Clock } from '@phosphor-icons/react';

interface Tab {
  id: string;
  label: string;
  title: string;
  meta: string;
  points: string[];
}

const ease = [0.22, 1, 0.36, 1] as const;

export default function ApproachTabs({ tabs, cta }: { tabs: Tab[]; cta: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const tab = tabs.find((t) => t.id === active)!;

  return (
    <MotionConfig reducedMotion="user">
      <div className="rounded-3xl border border-line bg-surface p-2">
        <div role="tablist" aria-label={tabs.map((t) => t.label).join(', ')} className="grid grid-cols-3 rounded-2xl bg-mist p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className="relative rounded-xl px-2 py-3 text-sm font-semibold sm:text-base"
            >
              {active === t.id && (
                <motion.span
                  layoutId="approach-pill"
                  transition={{ duration: 0.5, ease }}
                  className="absolute inset-0 rounded-xl bg-surface shadow-[0_2px_12px_rgba(18,48,42,0.08)]"
                />
              )}
              <span className={`relative transition-colors duration-300 ${active === t.id ? 'text-sage-deep' : 'text-muted'}`}>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="relative min-h-[20rem] p-4 sm:p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-bold text-ink">{tab.title}</h3>
                <span className="flex items-center gap-2 rounded-full bg-sky-tint px-3 py-1 text-sm font-semibold text-sky">
                  <Clock size={16} weight="bold" /> {tab.meta}
                </span>
              </div>
              <ul className="mt-6 flex flex-col gap-3">
                {tab.points.map((p, i) => (
                  <motion.li
                    key={p}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.5, ease }}
                    className="flex items-start gap-3 text-base text-ink-soft"
                  >
                    <CheckCircle size={22} weight="duotone" className="mt-0.5 shrink-0 text-sage" />
                    {p}
                  </motion.li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-booking', { detail: { who: tab.id } }))}
                className="mt-8 rounded-xl bg-sage px-3 py-2 text-base font-semibold text-white transition duration-300 hover:bg-sage-deep active:scale-[0.98]"
              >
                {cta}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
