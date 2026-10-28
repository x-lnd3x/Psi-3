import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Замените на реальный домен перед публикацией
export default defineConfig({
  site: 'https://khalikova-psy.ru',
  integrations: [react(), sitemap()],
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'tt'],
    routing: { prefixDefaultLocale: false },
  },
  build: { format: 'directory' },
  // Служебная панель Astro внизу экрана мешает смотреть сайт
  devToolbar: { enabled: false },
  vite: { plugins: [tailwindcss()] },
});
