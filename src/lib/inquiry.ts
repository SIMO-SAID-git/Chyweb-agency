import { z } from 'zod';
export const projectTypes = ['new', 'redesign', 'ecommerce', 'other'] as const;
export const serviceKeys = ['design', 'dev', 'ecom', 'uiux', 'redesign', 'maint', 'unsure'] as const;
// Scope-based options on purpose: they must not imply fixed Chyweb prices.
export const budgets = ['small', 'medium', 'large', 'discuss'] as const;
export const timelines = ['asap', 'short', 'medium', 'flexible'] as const;
// Error messages are codes; the UI maps them to localized text (messages/*.json -> form.err.*).
const opt = (max: number) => z.string().trim().max(max, 'long');
const pick = <T extends readonly [string, ...string[]]>(v: T) => z.enum(v, { errorMap: () => ({ message: 'required' }) });
export const inquirySchema = z.object({
  name: z.string().trim().min(2, 'required').max(100, 'long'),
  email: z.string().trim().min(1, 'required').email('email').max(200, 'long'),
  phone: opt(40), company: opt(120), country: opt(80),
  projectType: pick(projectTypes), service: pick(serviceKeys),
  description: z.string().trim().min(20, 'short').max(4000, 'long'),
  objectives: opt(2000),
  existingUrl: z.string().trim().max(300, 'long').refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), 'url'),
  budget: pick(budgets), timeline: pick(timelines), extra: opt(2000),
  consent: z.literal(true, { errorMap: () => ({ message: 'consent' }) }),
});
export const submitSchema = inquirySchema.extend({
  lang: z.enum(['en', 'fr', 'ar']), submissionId: z.string().uuid(),
  website: z.string().max(0), // honeypot: must stay empty
  startedAt: z.number(),      // time trap
});
export type InquiryInput = z.infer<typeof inquirySchema>;
export const stepFields: readonly (readonly string[])[] = [
  ['name', 'email', 'phone', 'company', 'country'],
  ['projectType', 'service', 'description', 'objectives', 'existingUrl'],
  ['budget', 'timeline', 'extra'], ['consent'],
];
