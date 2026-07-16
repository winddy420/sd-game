/**
 * Internationalisation for curriculum CONTENT (components, badges, phases,
 * concepts, quests) — distinct from the web app's UI message catalogs.
 *
 * Design (chosen over inline {en,th} fields):
 *  - Phase files stay the single English source of truth (untouched).
 *  - Translations live in a flat `Record<string,string>` catalog
 *    (`locales/th.ts`), keyed by a deterministic path derived from the content.
 *  - `tr(key, en, locale)` falls back to the English value automatically, so the
 *    game is shippable with partial Thai and fills in incrementally.
 *  - `generateContentKeys` walks the curriculum and emits every key + its
 *    English value — the drift test asserts each key has a Thai translation.
 *
 * Locale is a runtime, user-controlled preference, NOT a URL/routing concern.
 */

import type { ComponentDef, Badge, Phase, Concept, Quest } from './types';
import { THAI } from './locales/th';

/** The languages the game ships with. */
export type Locale = 'en' | 'th';

/** All supported locales, in display order. */
export const LOCALES: Locale[] = ['en', 'th'];

/** Fallback locale. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Narrow an unknown string to a Locale, defaulting to English. */
export function asLocale(value: unknown): Locale {
  return value === 'th' ? 'th' : 'en';
}

/** A generated translation entry: a stable key + its English source string. */
export interface ContentKey {
  key: string;
  en: string;
}

/** Source curriculum slice accepted by the key generator / resolvers. */
export interface LocalizableCurriculum {
  components: ComponentDef[];
  badges: Badge[];
  phases: Phase[];
  concepts: Concept[];
  quests: Quest[];
}

/**
 * Translate a single field. Returns the Thai catalog entry when present,
 * otherwise the English source (graceful fallback for partial translations).
 */
export function tr(
  key: string,
  en: string,
  locale: Locale,
  thai: Record<string, string> = THAI,
): string {
  if (locale === 'th' && thai[key]) return thai[key];
  return en;
}

/* ----------------------------- key generation ----------------------------- */

/** Walk the curriculum and emit every translatable key + its English value,
 *  including concept `body` (Markdown lesson text). This same scheme is used
 *  by the localized* resolvers, so keys can never drift from what the resolver
 *  looks up. */
export function generateContentKeys(c: LocalizableCurriculum): ContentKey[] {
  const out: ContentKey[] = [];

  for (const comp of c.components) {
    out.push({ key: `component:${comp.id}:name`, en: comp.name });
    out.push({ key: `component:${comp.id}:description`, en: comp.description });
  }
  for (const b of c.badges) {
    out.push({ key: `badge:${b.id}:name`, en: b.name });
    out.push({ key: `badge:${b.id}:description`, en: b.description });
  }
  for (const p of c.phases) {
    out.push({ key: `phase:${p.id}:title`, en: p.title });
    out.push({ key: `phase:${p.id}:tagline`, en: p.tagline });
    out.push({ key: `phase:${p.id}:description`, en: p.description });
  }
  for (const con of c.concepts) {
    out.push({ key: `concept:${con.id}:title`, en: con.title });
    out.push({ key: `concept:${con.id}:summary`, en: con.summary });
    out.push({ key: `concept:${con.id}:body`, en: con.body });
  }
  for (const q of c.quests) {
    out.push({ key: `quest:${q.id}:title`, en: q.title });
    switch (q.type) {
      case 'lesson':
        q.questions.forEach((qq, qi) => {
          out.push({ key: `quest:${q.id}:q${qi}:prompt`, en: qq.prompt });
          qq.options.forEach((o, oi) =>
            out.push({ key: `quest:${q.id}:q${qi}:opt${oi}`, en: o }),
          );
          out.push({ key: `quest:${q.id}:q${qi}:expl`, en: qq.explanation });
        });
        break;
      case 'architecture':
        out.push({ key: `quest:${q.id}:brief`, en: q.brief });
        break;
      case 'incident':
        out.push({ key: `quest:${q.id}:fail`, en: q.failureDescription });
        q.symptoms.forEach((s, si) => out.push({ key: `quest:${q.id}:sym${si}`, en: s }));
        q.steps.forEach((choices, ti) =>
          choices.forEach((ch, ci) => {
            out.push({ key: `quest:${q.id}:step${ti}:choice${ci}:label`, en: ch.label });
            out.push({ key: `quest:${q.id}:step${ti}:choice${ci}:feedback`, en: ch.feedback });
          }),
        );
        break;
      case 'command':
        out.push({ key: `quest:${q.id}:intro`, en: q.intro });
        q.steps.forEach((st, ti) => {
          out.push({ key: `quest:${q.id}:step${ti}:prompt`, en: st.prompt });
          out.push({ key: `quest:${q.id}:step${ti}:hint`, en: st.hint });
          out.push({ key: `quest:${q.id}:step${ti}:answer`, en: st.sampleAnswer });
        });
        break;
    }
  }
  return out;
}

/* ------------------------------- resolvers -------------------------------- */

export function localizedComponent(c: ComponentDef, locale: Locale, thai?: Record<string, string>): ComponentDef {
  if (locale !== 'th') return c;
  return {
    ...c,
    name: tr(`component:${c.id}:name`, c.name, locale, thai),
    description: tr(`component:${c.id}:description`, c.description, locale, thai),
  };
}

export function localizedBadge(b: Badge, locale: Locale, thai?: Record<string, string>): Badge {
  if (locale !== 'th') return b;
  return {
    ...b,
    name: tr(`badge:${b.id}:name`, b.name, locale, thai),
    description: tr(`badge:${b.id}:description`, b.description, locale, thai),
  };
}

export function localizedPhase(p: Phase, locale: Locale, thai?: Record<string, string>): Phase {
  if (locale !== 'th') return p;
  return {
    ...p,
    title: tr(`phase:${p.id}:title`, p.title, locale, thai),
    tagline: tr(`phase:${p.id}:tagline`, p.tagline, locale, thai),
    description: tr(`phase:${p.id}:description`, p.description, locale, thai),
  };
}

export function localizedConcept(c: Concept, locale: Locale, thai?: Record<string, string>): Concept {
  if (locale !== 'th') return c;
  return {
    ...c,
    title: tr(`concept:${c.id}:title`, c.title, locale, thai),
    summary: tr(`concept:${c.id}:summary`, c.summary, locale, thai),
    body: tr(`concept:${c.id}:body`, c.body, locale, thai),
  };
}

export function localizedQuest(q: Quest, locale: Locale, thai?: Record<string, string>): Quest {
  if (locale !== 'th') return q;
  const T = (key: string, en: string) => tr(key, en, locale, thai);
  switch (q.type) {
    case 'lesson':
      return {
        ...q,
        title: T(`quest:${q.id}:title`, q.title),
        questions: q.questions.map((qq, qi) => ({
          ...qq,
          prompt: T(`quest:${q.id}:q${qi}:prompt`, qq.prompt),
          options: qq.options.map((o, oi) => T(`quest:${q.id}:q${qi}:opt${oi}`, o)),
          explanation: T(`quest:${q.id}:q${qi}:expl`, qq.explanation),
        })),
      };
    case 'architecture':
      return {
        ...q,
        title: T(`quest:${q.id}:title`, q.title),
        brief: T(`quest:${q.id}:brief`, q.brief),
      };
    case 'incident':
      return {
        ...q,
        title: T(`quest:${q.id}:title`, q.title),
        failureDescription: T(`quest:${q.id}:fail`, q.failureDescription),
        symptoms: q.symptoms.map((s, si) => T(`quest:${q.id}:sym${si}`, s)),
        steps: q.steps.map((choices, ti) =>
          choices.map((ch, ci) => ({
            ...ch,
            label: T(`quest:${q.id}:step${ti}:choice${ci}:label`, ch.label),
            feedback: T(`quest:${q.id}:step${ti}:choice${ci}:feedback`, ch.feedback),
          })),
        ),
      };
    case 'command':
      return {
        ...q,
        title: T(`quest:${q.id}:title`, q.title),
        intro: T(`quest:${q.id}:intro`, q.intro),
        steps: q.steps.map((st, ti) => ({
          ...st,
          prompt: T(`quest:${q.id}:step${ti}:prompt`, st.prompt),
          hint: T(`quest:${q.id}:step${ti}:hint`, st.hint),
          sampleAnswer: T(`quest:${q.id}:step${ti}:answer`, st.sampleAnswer),
        })),
      };
  }
}
