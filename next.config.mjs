import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
// Allow next/image to optimise images uploaded to this project's public Supabase Storage bucket (used by the CMS).
const sb = process.env.NEXT_PUBLIC_SUPABASE_URL;
const remotePatterns = sb ? [{ protocol: new URL(sb).protocol.replace(':', ''), hostname: new URL(sb).hostname, ...(new URL(sb).port && { port: new URL(sb).port }), pathname: '/storage/v1/object/public/**' }] : [];
export default withNextIntl({ images: { formats: ['image/avif', 'image/webp'], remotePatterns } });
