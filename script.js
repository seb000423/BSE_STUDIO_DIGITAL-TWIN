// KR / EN toggle — the choice is remembered in this browser; with no choice yet, follow the browser language
const KEY = 'bse-dt-lang';

function readLang() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'ko' || stored === 'en') return stored;
  } catch {
    // localStorage can throw (private windows, file:// in some browsers) — fall back to the browser language
  }
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-toggle button').forEach((button) => {
    const on = button.dataset.lang === lang;
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', String(on));
  });
  const brand = document.querySelector('.brand');
  brand.title = brand.dataset[lang === 'ko' ? 'titleKo' : 'titleEn'];
  // Names read out by screen readers
  const key = lang === 'ko' ? 'Ko' : 'En';
  document.querySelectorAll('[data-label-ko]').forEach((el) => {
    el.setAttribute('aria-label', el.dataset[`label${key}`]);
  });
  if (shown) hint.textContent = shown.dataset[lang];
}

const hint = document.getElementById('hint');
let shown = null;

let lang = readLang();
applyLang(lang);

document.querySelectorAll('.lang-toggle button').forEach((button) => {
  button.addEventListener('click', () => {
    lang = button.dataset.lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* Even if it cannot be saved, it applies for this visit */
    }
    applyLang(lang);
  });
});

// Neither screen is online yet — say so in place
document.querySelectorAll('.row-buttons .button').forEach((button) => {
  button.addEventListener('click', () => {
    shown = button;
    hint.textContent = button.dataset[lang];
    hint.hidden = false;
  });
});
