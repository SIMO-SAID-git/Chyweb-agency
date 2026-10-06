import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
export default getRequestConfig(async ({ requestLocale }) => {
  const req = await requestLocale;
  const locale = req && (routing.locales as readonly string[]).includes(req) ? req : routing.defaultLocale;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
