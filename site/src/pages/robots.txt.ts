import type { APIRoute } from 'astro';
import { site } from '../lib/site';

// Пока сайт живёт на тестовом адресе (PUBLIC_NOINDEX=1), он целиком закрыт от поисковиков
export const GET: APIRoute = () => {
  const body =
    import.meta.env.PUBLIC_NOINDEX === '1'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nDisallow: /api/\nSitemap: ${new URL('/sitemap-index.xml', site.domain)}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
