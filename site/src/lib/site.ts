// Все контакты, цены и расписание собраны здесь: меняйте их в одном месте.

export const site = {
  name: 'Екатерина Халикова',
  domain: 'https://khalikova-psy.ru',
  contacts: {
    telegram: 'https://t.me/ekaterina16h',
    telegramHandle: '@ekaterina16h',
    // Ссылку на MAX добавить сюда, пока null кнопка показывается неактивной
    max: null as string | null,
    whatsapp: 'https://wa.me/79674635344',
    phone: '+7 967 463 53 44',
    phoneHref: 'tel:+79674635344',
  },
  prices: {
    intro: 0,
    pair: 4000,
    family: 4000,
    individual: 2500,
    pairPackage5: 18000,
  },
  // Рабочее время по Москве: день недели (0 = вс) → начала встреч
  schedule: {
    1: ['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'],
    2: ['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'],
    3: ['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'],
    4: ['10:00', '12:00', '14:00', '16:00', '18:00', '19:30'],
    5: ['10:00', '12:00', '14:00', '16:00', '18:00'],
    6: ['11:00', '13:00', '15:00'],
  } as Record<number, string[]>,
  bookingDays: 14,
  leadEndpoint: '/api/lead.php',
};

export type Lang = 'ru' | 'tt';

export function formatPrice(value: number, lang: Lang) {
  if (value === 0) return lang === 'ru' ? 'Бесплатно' : 'Бушлай';
  return value.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
}

export function localePath(lang: Lang, path: string) {
  const clean = path.startsWith('/') ? path : '/' + path;
  if (lang === 'ru') return clean;
  return clean === '/' ? '/tt/' : '/tt' + clean;
}
