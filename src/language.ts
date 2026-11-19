import { useEffect, useState } from 'react';
import { LANGUAGES, type Language, type LanguageSetting } from './model';
import { steamClient } from './steam-client';

/** Steam's own language names (Settings → Interface) for the languages the XMB speaks. */
const STEAM_NAMES: Record<string, Language> = {
  english: 'en', french: 'fr', german: 'de', spanish: 'es', latam: 'es', brazilian: 'pt', portuguese: 'pt',
  italian: 'it', polish: 'pl', russian: 'ru', schinese: 'zh', tchinese: 'zh', japanese: 'ja',
};

/** A Steam language name or an ISO code ("fr-FR") → ours, or undefined if we have no words for it. */
export function languageFrom(name: unknown): Language | undefined {
  if (typeof name !== 'string' || !name) return undefined;
  const lower = name.toLowerCase();
  if (STEAM_NAMES[lower]) return STEAM_NAMES[lower];
  const iso = lower.slice(0, 2);
  return (LANGUAGES as readonly string[]).includes(iso) ? iso as Language : undefined;
}

let detected: Language | undefined;
let asked = false;
const listeners = new Set<() => void>();

// Steam's frontend keeps the interface language in LocalizationManager (the Big Picture window
// reads it from the main context, its opener) and in the SharedJSContext address (?LANGUAGE=).
function readNow(): Language | undefined {
  const windows: unknown[] = [window];
  try { if (window.opener) windows.push(window.opener); } catch { /* another origin */ }
  for (const win of windows) {
    try {
      const manager = (win as { LocalizationManager?: { m_rgLocalesToUse?: string[]; GetPreferredLocales?: () => string[] } }).LocalizationManager;
      const name = manager?.m_rgLocalesToUse?.[0] ?? manager?.GetPreferredLocales?.()?.[0];
      if (typeof name === 'string') return languageFrom(name) ?? 'en';
    } catch { /* not ready */ }
    try {
      const param = new URL((win as Window).location.href).searchParams.get('LANGUAGE');
      if (param) return languageFrom(param) ?? 'en';
    } catch { /* not ready */ }
  }
  return undefined;
}

function fromBrowser(): Language {
  for (const code of navigator.languages ?? [navigator.language]) {
    const found = languageFrom(code);
    if (found) return found;
  }
  return 'en';
}

/** Steam's interface language, in the XMB's languages; English for one it does not speak. */
export function steamLanguage(): Language {
  if (!detected) detected = readNow();
  if (!detected && !asked) {
    asked = true;
    let settings: { GetCurrentLanguage?: () => Promise<string> } | undefined;
    try { settings = (steamClient() as { Settings?: typeof settings } | undefined)?.Settings; } catch { /* no SteamClient (preview) */ }
    settings?.GetCurrentLanguage?.().then(name => {
      const found = languageFrom(name) ?? 'en';
      if (found !== detected) { detected = found; listeners.forEach(fn => fn()); }
    }).catch(() => { /* keep the browser's */ });
  }
  return detected ?? fromBrowser();
}

/** The language the XMB is drawn in: the one chosen, or Steam's for «Steam language». */
export function uiLanguage(choice: LanguageSetting): Language {
  return choice === 'auto' ? steamLanguage() : choice;
}

/** uiLanguage, redrawn once Steam answers which language it uses. */
export function useLanguage(choice: LanguageSetting): Language {
  const [, redraw] = useState(0);
  useEffect(() => {
    const fn = () => redraw(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return uiLanguage(choice);
}
