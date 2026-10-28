import ru from './ru';
import tt from './tt';
import type { Lang } from '../lib/site';

export const dicts = { ru, tt };
export function t(lang: Lang) {
  return dicts[lang];
}
