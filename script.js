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
  const hint = document.getElementById('monitor-hint');
  hint.textContent = hint.dataset[lang];
}

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

// Monitor has no screen yet — say so in place
document.getElementById('monitor').addEventListener('click', () => {
  document.getElementById('monitor-hint').hidden = false;
});
