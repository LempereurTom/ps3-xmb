import { useEffect, useState } from 'react';
import type { Game, Platform } from './model';

const DWELL_MS = 500;
const IMAGE_TIMEOUT_MS = 6000;

/** PS3-style PIC1 background: only load once the cursor rests on a game. */
export function GameBackdrop({ game, enabled, resolve, onVisible }: {
  game?: Game; enabled: boolean; resolve?: Platform['backgrounds']; onVisible?: (visible: boolean) => void;
}) {
  const sources = [...new Set((game?.backgrounds ?? game?.artwork ?? []).filter(url => typeof url === 'string' && url.length > 0))];
  // A library refresh replaces Game objects. Keep an ongoing load when their art
  // and identity have not changed, but never show a previous game's poster.
  const request = enabled && game && (sources.length || resolve) ? JSON.stringify([game.id, sources]) : '';
  const [loaded, setLoaded] = useState<{ request: string; url: string }>();

  useEffect(() => {
    setLoaded(undefined);
    if (!request) return;
    const [appId, fallback] = JSON.parse(request) as [number, string[]];
    let candidates = fallback;
    let cancelled = false;
    let next = 0;
    let pending: HTMLImageElement | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const release = () => {
      clearTimeout(timeout);
      if (pending) {
        pending.onload = null;
        pending.onerror = null;
        pending.removeAttribute('src');
        pending = undefined;
      }
    };
    const loadNext = () => {
      release();
      if (cancelled || next >= candidates.length) return;
      const url = candidates[next++];
      const image = new Image();
      pending = image;
      image.decoding = 'async';
      const current = () => !cancelled && pending === image;
      const show = () => {
        if (!current()) return;
        setLoaded({ request, url });
        release();
      };
      const failed = () => { if (current()) loadNext(); };
      image.onload = () => {
        if (!current()) return;
        if (!image.naturalWidth) { failed(); return; }
        if (typeof image.decode === 'function') void image.decode().then(show, failed);
        else show();
      };
      image.onerror = failed;
      timeout = setTimeout(failed, IMAGE_TIMEOUT_MS);
      image.src = url;
    };
    const dwell = setTimeout(async () => {
      if (resolve) {
        const cached = await Promise.race([resolve(appId).catch(() => []),
          new Promise<string[]>(done => { timeout = setTimeout(() => done([]), 1500); })]);
        if (cancelled) return;
        candidates = [...new Set([...cached, ...fallback].filter(Boolean))];
      }
      loadNext();
    }, DWELL_MS);
    return () => { cancelled = true; clearTimeout(dwell); release(); };
  }, [request, resolve]);

  const visible = !!request && loaded?.request === request;
  // The XMB pauses its wave while the poster covers it (nothing to animate behind a picture).
  useEffect(() => { onVisible?.(visible); }, [visible, onVisible]);
  return <div className={`xmb-backdrop${visible ? ' visible' : ''}`} aria-hidden="true">
    {visible && <img key={loaded.url} className="xmb-backdrop-image" src={loaded.url} alt="" draggable={false} />}
  </div>;
}
