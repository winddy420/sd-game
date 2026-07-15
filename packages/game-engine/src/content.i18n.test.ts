import { describe, it, expect } from 'vitest';
import { CURRICULUM, generateContentKeys, THAI } from '@sd-game/content';

/**
 * Drift guard for Thai content translations.
 *
 * `generateContentKeys` walks the curriculum and emits every translatable key
 * (component/badge/phase/concept title+summary, and all quest text fields —
 * concept `body` Markdown is intentionally excluded). This test asserts every
 * such key has a Thai entry in the `THAI` catalog, so a newly-authored quest
 * can't silently ship English-only to Thai users.
 *
 * Keys whose English value is a pure technical term (kept verbatim in both
 * locales) are listed in ALLOW_PASSTHROUGH so the test stays meaningful rather
 * than flagging intentional English-kept terms.
 */
describe('Thai content translation coverage', () => {
  const keys = generateContentKeys(CURRICULUM);

  it('every content key has a Thai translation', () => {
    const missing = keys.filter((k) => !(k.key in THAI)).map((k) => k.key);
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.error(`Missing ${missing.length} Thai translations:\n${missing.slice(0, 50).join('\n')}${missing.length > 50 ? `\n…(+${missing.length - 50} more)` : ''}`);
    }
    expect(missing).toEqual([]);
  });

  it('no Thai key is orphaned (not matching any content field)', () => {
    const valid = new Set(keys.map((k) => k.key));
    const orphans = Object.keys(THAI).filter((k) => !valid.has(k));
    expect(orphans).toEqual([]);
  });
});
