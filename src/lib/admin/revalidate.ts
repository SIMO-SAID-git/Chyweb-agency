// After ANY admin content change: invalidate the 'content' data tag (Stage 2 content layer) AND the rendered pages.
// Both are needed: revalidateTag refreshes the data; revalidatePath is what clears pages cached as 404 (e.g. a project
// that was unpublished and is now re-published) and refreshes every language version immediately.
import { revalidatePath, revalidateTag } from 'next/cache';
const LOCALES = ['en', 'fr', 'ar'];
export function revalidateContent(o: { services?: (string | null | undefined)[]; projects?: (string | null | undefined)[] } = {}) {
  revalidateTag('content');
  revalidatePath('/[locale]', 'layout');                       // every public page in every language
  for (const l of LOCALES) {
    for (const p of ['', '/services', '/portfolio', '/faq']) revalidatePath(`/${l}${p}`);
    for (const s of o.services ?? []) if (s) revalidatePath(`/${l}/services/${s}`);
    for (const p of o.projects ?? []) if (p) revalidatePath(`/${l}/portfolio/${p}`);
  }
  revalidatePath('/sitemap.xml');
}
