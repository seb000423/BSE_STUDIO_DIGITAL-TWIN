/** KR / EN — the chosen language is remembered in this browser; with no choice yet, follow the browser language */
export type Lang = 'ko' | 'en';

const KEY = 'bse-dt-lang';

export function readLang(): Lang {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'ko' || stored === 'en') return stored;
  } catch {
    // localStorage throws in private windows — fall back to the browser language
  }
  return (navigator.language ?? '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

export function writeLang(lang: Lang): void {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* Even if it cannot be saved, it applies for this visit */
  }
}

const TEXT = {
  ko: {
    home: '처음 화면으로',
    monitoringSoon: '모니터링 화면은 준비 중입니다.',
  },
  en: {
    home: 'Back to start',
    monitoringSoon: 'The monitoring view is coming soon.',
  },
} satisfies Record<Lang, Record<string, string>>;

export function texts(lang: Lang): (typeof TEXT)['ko'] {
  return TEXT[lang];
}
