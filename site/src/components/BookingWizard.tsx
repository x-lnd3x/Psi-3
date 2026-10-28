// Пошаговая запись: для кого → запрос → формат → время → контакты.
// Работает как всплывающее окно (mode="modal") и как блок на странице (mode="inline").
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Users, UsersThree, User, X, ArrowLeft, ArrowRight, ChatCircleText, Sparkle, CalendarBlank } from '@phosphor-icons/react';
import { site, type Lang } from '../lib/site';
import type { Dict } from '../i18n/ru';

type D = Dict['booking'];
type Channel = 'telegram' | 'max' | 'whatsapp' | 'phone';

interface Props {
  lang: Lang;
  mode: 'modal' | 'inline';
  d: D;
  privacyHref: string;
  telegram: string;
  hasMax: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;
const whoIcons = { pair: Users, family: UsersThree, self: User } as const;

interface FormState {
  who: string;
  topics: string[];
  format: string;
  date: string | null;
  time: string | null;
  name: string;
  channel: Channel;
  contact: string;
  comment: string;
  consent: boolean;
  website: string; // ловушка для ботов
}

const emptyForm: FormState = {
  who: '',
  topics: [],
  format: '',
  date: null,
  time: null,
  name: '',
  channel: 'telegram',
  contact: '',
  comment: '',
  consent: false,
  website: '',
};

export default function BookingWizard({ lang, mode, d, privacyHref, telegram }: Props) {
  const [open, setOpen] = useState(mode === 'inline');
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'contact' | 'consent' | 'network', string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (mode !== 'modal') return;
    const onOpen = (e: Event) => {
      const who = (e as CustomEvent).detail?.who as string | undefined;
      lastFocus.current = document.activeElement as HTMLElement;
      setForm({ ...emptyForm, who: who ?? '' });
      setStep(who ? 1 : 0);
      setErrors({});
      setStatus('idle');
      setOpen(true);
    };
    window.addEventListener('open-booking', onOpen);
    return () => window.removeEventListener('open-booking', onOpen);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'modal' || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button, input, a')?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, mode]);

  function close() {
    if (mode === 'inline') {
      setForm(emptyForm);
      setStep(0);
      setStatus('idle');
      return;
    }
    setOpen(false);
    lastFocus.current?.focus();
  }

  function go(to: number) {
    setDir(to > step ? 1 : -1);
    setStep(to);
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = d.errors.name;
    const raw = form.contact.trim();
    if (!raw) e.contact = d.errors.contact;
    else if (form.channel !== 'telegram' || !raw.startsWith('@')) {
      const digits = raw.replace(/\D/g, '');
      const isHandle = form.channel === 'telegram' && /^[a-zA-Z][\w]{3,}$/.test(raw);
      if (!isHandle && !(digits.length === 11 && /^[78]/.test(digits))) e.contact = d.errors.phone;
    }
    if (!form.consent) e.consent = d.errors.consent;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setStatus('sending');
    setErrors({});
    try {
      if (import.meta.env.DEV) {
        await new Promise((r) => setTimeout(r, 900));
      } else {
        const res = await fetch(site.leadEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, lang, page: location.pathname }),
        });
        if (!res.ok) throw new Error(String(res.status));
      }
      setStatus('success');
    } catch {
      setStatus('idle');
      setErrors({ network: d.errors.network });
    }
  }

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">{d.title}</h2>
        {mode === 'modal' && (
          <button
            type="button"
            onClick={close}
            aria-label={lang === 'ru' ? 'Закрыть' : 'Ябу'}
            className="grid size-10 place-items-center rounded-xl text-muted transition duration-300 hover:bg-mist hover:text-ink active:scale-[0.98]"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {status !== 'success' && <Progress steps={d.steps} step={step} />}

      <div className="relative mt-6 min-h-[22rem] flex-1">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={status === 'success' ? 'ok' : step}
            custom={dir}
            initial={{ opacity: 0, x: 32 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 * dir }}
            transition={{ duration: 0.4, ease }}
          >
            {status === 'success' ? (
              <Success d={d} telegram={telegram} onDone={close} />
            ) : step === 0 ? (
              <StepWho d={d} value={form.who} onPick={(v) => { set('who', v); go(1); }} />
            ) : step === 1 ? (
              <StepTopics d={d} value={form.topics} onChange={(v) => set('topics', v)} />
            ) : step === 2 ? (
              <StepFormat d={d} value={form.format} onPick={(v) => { set('format', v); go(3); }} />
            ) : step === 3 ? (
              <StepTime d={d} date={form.date} time={form.time} onChange={(date, time) => setForm((f) => ({ ...f, date, time }))} />
            ) : (
              <StepContacts d={d} form={form} set={set} errors={errors} privacyHref={privacyHref} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {status !== 'success' && (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => go(step - 1)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-base font-semibold text-muted transition duration-300 hover:bg-mist hover:text-ink active:scale-[0.98]"
            >
              <ArrowLeft size={18} /> {d.back}
            </button>
          ) : (
            <span />
          )}
          {step === 1 || step === 3 ? (
            <button
              type="button"
              onClick={() => go(step + 1)}
              className="flex items-center gap-2 rounded-xl bg-sage px-3 py-2 text-base font-semibold text-white transition duration-300 hover:bg-sage-deep active:scale-[0.98]"
            >
              {d.next} <ArrowRight size={18} />
            </button>
          ) : step === 4 ? (
            <button
              type="submit"
              form={`booking-form-${mode}`}
              disabled={status === 'sending'}
              className="flex items-center gap-2 rounded-xl bg-sage px-3 py-2 text-base font-semibold text-white transition duration-300 hover:bg-sage-deep active:scale-[0.98] disabled:opacity-70"
            >
              {status === 'sending' ? (
                <>
                  <span className="h-4 w-16 animate-pulse rounded-full bg-white/40" aria-hidden="true" />
                  <span className="sr-only">{d.sending}</span>
                </>
              ) : (
                d.submit
              )}
            </button>
          ) : null}
        </div>
      )}
      {errors.network && (
        <p role="alert" className="mt-3 rounded-xl bg-[#fbeeee] px-3 py-2 text-sm text-[#8a2b2b]">
          {errors.network}
        </p>
      )}
    </div>
  );

  const wrapped = (
    <form id={`booking-form-${mode}`} onSubmit={submit} noValidate className="h-full">
      {body}
    </form>
  );

  if (mode === 'inline') {
    return (
      <MotionConfig reducedMotion="user">
        <div ref={panelRef} className="rounded-3xl border border-line bg-surface p-6 md:p-8">
          {wrapped}
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={close} aria-hidden="true" />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={d.title}
              initial={{ y: 64, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 64, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease }}
              className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_24px_64px_rgba(18,48,42,0.2)] md:max-w-xl md:rounded-3xl md:p-8"
            >
              {wrapped}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function Progress({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="mt-5">
      <div className="relative h-1 overflow-hidden rounded-full bg-mist">
        <motion.div
          className="absolute inset-0 origin-left rounded-full bg-sage"
          animate={{ scaleX: (step + 1) / steps.length }}
          transition={{ duration: 0.5, ease }}
        />
      </div>
      <ol className="mt-3 hidden justify-between text-xs font-semibold sm:flex">
        {steps.map((s, i) => (
          <li key={s} className={i <= step ? 'text-sage-deep' : 'text-muted'} aria-current={i === step ? 'step' : undefined}>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs font-semibold text-sage-deep sm:hidden">
        {step + 1} / {steps.length} · {steps[step]}
      </p>
    </div>
  );
}

function Question({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-ink">{children}</h3>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function OptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3, ease }}
      aria-pressed={selected}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors duration-300 ${
        selected ? 'border-sage bg-sage-tint' : 'border-line bg-surface hover:border-sage/40'
      }`}
    >
      {children}
    </motion.button>
  );
}

function StepWho({ d, value, onPick }: { d: D; value: string; onPick: (v: string) => void }) {
  return (
    <div>
      <Question>{d.whoQuestion}</Question>
      <div className="flex flex-col gap-3">
        {d.who.map((w) => {
          const Icon = whoIcons[w.id as keyof typeof whoIcons];
          return (
            <OptionCard key={w.id} selected={value === w.id} onClick={() => onPick(w.id)}>
              <span className="grid size-12 place-items-center rounded-xl bg-sky-tint text-sky">
                <Icon size={24} weight="duotone" />
              </span>
              <span className="text-base font-semibold text-ink">{w.label}</span>
            </OptionCard>
          );
        })}
      </div>
    </div>
  );
}

function StepTopics({ d, value, onChange }: { d: D; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <Question hint={d.topicsHint}>{d.topicsQuestion}</Question>
      <div className="flex flex-wrap gap-2">
        {d.topics.map((topic) => {
          const on = value.includes(topic);
          return (
            <motion.button
              key={topic}
              type="button"
              aria-pressed={on}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(on ? value.filter((v) => v !== topic) : [...value, topic])}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                on ? 'border-sage bg-sage text-white' : 'border-line bg-surface text-ink-soft hover:border-sage/40'
              }`}
            >
              {topic}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepFormat({ d, value, onPick }: { d: D; value: string; onPick: (v: string) => void }) {
  return (
    <div>
      <Question>{d.formatQuestion}</Question>
      <div className="flex flex-col gap-3">
        {d.formats.map((f, i) => (
          <OptionCard key={f.id} selected={value === f.id} onClick={() => onPick(f.id)}>
            <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${i === 0 ? 'bg-sage-tint text-sage' : 'bg-sky-tint text-sky'}`}>
              {i === 0 ? <Sparkle size={24} weight="duotone" /> : <ChatCircleText size={24} weight="duotone" />}
            </span>
            <span className="flex flex-col">
              <span className="text-base font-semibold text-ink">{f.label}</span>
              <span className="text-sm text-muted">{f.note}</span>
            </span>
          </OptionCard>
        ))}
      </div>
    </div>
  );
}

// Свободные окна по расписанию из site.ts, время московское
function useSlots() {
  return useMemo(() => {
    const now = new Date();
    const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const days: { iso: string; date: Date; times: string[] }[] = [];
    for (let i = 0; i < site.bookingDays; i++) {
      const day = new Date(msk.getFullYear(), msk.getMonth(), msk.getDate() + i);
      let times = site.schedule[day.getDay()] ?? [];
      if (i === 0) {
        const minMinutes = msk.getHours() * 60 + msk.getMinutes() + 180;
        times = times.filter((t) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m >= minMinutes;
        });
      }
      if (times.length) {
        const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
        days.push({ iso, date: day, times });
      }
    }
    return days;
  }, []);
}

function StepTime({ d, date, time, onChange }: { d: D; date: string | null; time: string | null; onChange: (date: string | null, time: string | null) => void }) {
  const days = useSlots();
  const selected = days.find((x) => x.iso === date) ?? null;
  return (
    <div>
      <Question hint={d.timeHint}>{d.timeQuestion}</Question>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label={d.timeQuestion}>
        {days.map((day) => {
          const on = day.iso === date;
          return (
            <button
              key={day.iso}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => onChange(day.iso, null)}
              className={`flex w-16 shrink-0 snap-start flex-col items-center gap-1 rounded-2xl border py-3 transition-colors duration-300 ${
                on ? 'border-sage bg-sage text-white' : 'border-line bg-surface text-ink hover:border-sage/40'
              }`}
            >
              <span className={`text-xs font-semibold ${on ? 'text-white/80' : 'text-muted'}`}>{d.weekdays[day.date.getDay()]}</span>
              <span className="text-xl font-bold">{day.date.getDate()}</span>
              <span className={`text-xs ${on ? 'text-white/80' : 'text-muted'}`}>{d.months[day.date.getMonth()]}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 min-h-24">
        {selected ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {selected.times.map((tm, i) => (
              <motion.button
                key={tm}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease }}
                aria-pressed={time === tm}
                onClick={() => onChange(selected.iso, tm)}
                className={`rounded-xl border py-2 text-base font-semibold transition-colors duration-300 ${
                  time === tm ? 'border-sage bg-sage-tint text-sage-deep' : 'border-line bg-surface text-ink hover:border-sage/40'
                }`}
              >
                {tm}
              </motion.button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-left text-sm text-muted"
          >
            <CalendarBlank size={20} />
            {d.timeSkip}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p id={id + '-err'} role="alert" className="text-sm text-[#8a2b2b]">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border bg-surface px-3 py-2 text-base text-ink placeholder:text-muted/70 transition-colors duration-300 focus:border-sage focus:outline-none';

function StepContacts({
  d,
  form,
  set,
  errors,
  privacyHref,
}: {
  d: D;
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  errors: Partial<Record<string, string>>;
  privacyHref: string;
}) {
  const channels: Channel[] = ['telegram', 'max', 'whatsapp', 'phone'];
  const uid = useId();
  const ids = { name: uid + 'name', contact: uid + 'contact', comment: uid + 'comment' };
  return (
    <div className="flex flex-col gap-4">
      <Question>{d.contactsQuestion}</Question>
      <Field id={ids.name} label={d.name} error={errors.name}>
        <input
          id={ids.name}
          autoComplete="given-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={d.namePlaceholder}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? ids.name + '-err' : undefined}
          className={inputCls + (errors.name ? ' border-[#c25b5b]' : ' border-line')}
        />
      </Field>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">{d.channel}</legend>
        <div className="relative grid grid-cols-4 rounded-xl bg-mist p-1">
          {channels.map((ch) => (
            <button
              key={ch}
              type="button"
              aria-pressed={form.channel === ch}
              onClick={() => set('channel', ch)}
              className="relative rounded-lg py-2 text-sm font-semibold"
            >
              {form.channel === ch && (
                <motion.span layoutId="channel-pill" transition={{ duration: 0.5, ease }} className="absolute inset-0 rounded-lg bg-surface shadow-sm" />
              )}
              <span className={`relative ${form.channel === ch ? 'text-ink' : 'text-muted'}`}>{d.channels[ch]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <Field id={ids.contact} label={d.contactLabel} error={errors.contact}>
        <input
          id={ids.contact}
          inputMode={form.channel === 'telegram' ? 'text' : 'tel'}
          autoComplete={form.channel === 'telegram' ? 'off' : 'tel'}
          value={form.contact}
          onChange={(e) => set('contact', e.target.value)}
          placeholder={d.contactPlaceholder[form.channel]}
          aria-invalid={!!errors.contact}
          aria-describedby={errors.contact ? ids.contact + '-err' : undefined}
          className={inputCls + (errors.contact ? ' border-[#c25b5b]' : ' border-line')}
        />
      </Field>
      <Field id={ids.comment} label={d.comment}>
        <textarea
          id={ids.comment}
          rows={3}
          value={form.comment}
          onChange={(e) => set('comment', e.target.value)}
          placeholder={d.commentPlaceholder}
          className={inputCls + ' resize-none border-line'}
        />
      </Field>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={(e) => set('website', e.target.value)}
        className="hidden"
        aria-hidden="true"
      />
      <div>
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set('consent', e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#23805f]"
            aria-invalid={!!errors.consent}
          />
          <span>
            {d.consentBefore}
            <a href={privacyHref} target="_blank" className="font-semibold text-sage underline underline-offset-4">
              {d.consentLink}
            </a>
            {d.consentAfter}
          </span>
        </label>
        {errors.consent && (
          <p role="alert" className="mt-1 text-sm text-[#8a2b2b]">
            {errors.consent}
          </p>
        )}
      </div>
    </div>
  );
}

function Success({ d, telegram, onDone }: { d: D; telegram: string; onDone: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center" role="status">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
        <motion.circle
          cx="44"
          cy="44"
          r="40"
          fill="#dcf1e8"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          style={{ transformOrigin: '44px 44px' }}
        />
        <motion.path
          d="M28 45 L39 56 L61 33"
          fill="none"
          stroke="#23805f"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease }}
        />
      </svg>
      <h3 className="mt-6 text-2xl font-bold text-ink">{d.successTitle}</h3>
      <p className="mt-2 max-w-sm text-base text-muted">{d.successText}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <a
          href={telegram}
          target="_blank"
          rel="noopener"
          className="rounded-xl border border-line px-3 py-2 text-base font-semibold text-ink transition duration-300 hover:bg-mist active:scale-[0.98]"
        >
          Telegram
        </a>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl bg-sage px-3 py-2 text-base font-semibold text-white transition duration-300 hover:bg-sage-deep active:scale-[0.98]"
        >
          {d.successAgain}
        </button>
      </div>
    </div>
  );
}
