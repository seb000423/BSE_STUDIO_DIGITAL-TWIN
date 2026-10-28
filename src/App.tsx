/**
 * Landing page — logo centered at the top, KR / EN on the right, and two entry points:
 * "Start Build" (authoring) and "Monitoring" (the digital-twin view, not built yet).
 */
import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { readLang, texts, writeLang, type Lang } from './i18n';

/** Where "Start Build" goes — BSE Studio's authoring screen. Override with VITE_BUILD_URL */
const BUILD_URL = import.meta.env.VITE_BUILD_URL ?? 'http://localhost:5173/';

export function App(): React.JSX.Element {
  const [lang, setLang] = useState<Lang>(readLang);
  const [monitoringSoon, setMonitoringSoon] = useState(false);
  const text = texts(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const choose = (next: Lang): void => {
    writeLang(next);
    setLang(next);
  };

  return (
    <div className="app">
      <header className="bar">
        <span className="side" />
        <a className="brand" href="/" title={text.home}>
          <LayoutGrid aria-hidden="true" />
          <span className="wordmark">BSE</span>
          <span className="product">Studio</span>
          <span className="version">beta</span>
        </a>
        <span className="side end">
          <span className="lang-toggle" role="group" aria-label="Language">
            {(['ko', 'en'] as const).map((next) => (
              <button key={next} className={lang === next ? 'on' : ''} aria-pressed={lang === next} onClick={() => choose(next)}>
                {next === 'ko' ? 'KR' : 'EN'}
              </button>
            ))}
          </span>
        </span>
      </header>

      <main className="welcome">
        <span className="title">BSE Studio</span>
        <h1>Build · Simulate · Execute</h1>
        <div className="row-buttons">
          <a className="button primary" href={BUILD_URL}>
            Start Build
          </a>
          <button className="button" onClick={() => setMonitoringSoon(true)}>
            Monitoring
          </button>
        </div>
        {monitoringSoon && <p className="hint">{text.monitoringSoon}</p>}
      </main>
    </div>
  );
}
