import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { MediaPlayerClass } from 'dashjs';
import { Icon } from './Icons';
import { useBrowserGestures } from './input';
import { words, type Command, type Language, type MediaFile, type MediaKind, type MediaLibrary, type Platform } from './model';

export function useMediaLibrary(platform: Platform, kind?: MediaKind) {
  const [libraries, setLibraries] = useState<Partial<Record<MediaKind, MediaLibrary>>>({});
  const [failure, setFailure] = useState<MediaKind>();
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    setFailure(undefined);
    // Horizontal navigation can pass through several categories in one gesture.
    const timer = setTimeout(() => {
      void platform.media(kind).then(result => {
        if (!cancelled) setLibraries(previous => ({ ...previous, [kind]: result }));
      }).catch(() => { if (!cancelled) setFailure(kind); });
    }, 140);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [kind, generation, platform]);
  return { library: kind ? libraries[kind] : undefined, failed: !!kind && failure === kind, retry: () => setGeneration(i => i + 1) };
}

export function MediaParents({ albums, index, back, backLabel }: {
  albums: { id: string; title: string }[]; index: number; back: () => void; backLabel: string;
}) {
  return <div className="xmb-album-rail">
    {albums.slice(Math.max(0, index - 3), index + 4).map((album, offset) => {
      const delta = offset + Math.max(0, index - 3) - index;
      return <span className={delta ? '' : 'selected'} style={{ top: `${50 + delta * 24.7}%` }} key={album.id} aria-hidden="true"><Icon name="folder" /></span>;
    })}
    <button className="xmb-album-back" tabIndex={-1} aria-label={backLabel} onMouseDown={e => e.preventDefault()} onClick={back}>◂</button>
  </div>;
}

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export type ViewerHandle = { command: (cmd: Command) => void };
interface ViewerProps {
  file: MediaFile; kind: MediaKind; base: string; language: Language; close: () => void;
  previous: boolean; next: boolean; step: (delta: number) => void;
}

export const MediaViewer = forwardRef<ViewerHandle, ViewerProps>(function MediaViewer({ file, kind, base, language, close, previous, next, step }, ref) {
  const t = words[language];
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controls, setControls] = useState(true);
  const dash = file.format === 'DASH';
  const src = file.url ?? `${base}/${file.id}/${dash ? 'clip.mpd' : 'file'}`;
  useEffect(() => {
    if (!dash || !video.current) return;
    const element = video.current;
    let cancelled = false;
    let player: MediaPlayerClass | undefined;
    void (async () => {
      // Media Source and the DASH module are only needed for a selected Steam recording.
      const moduleURL = `${base}/dash.mjs`;
      const { MediaPlayer } = await import(/* @vite-ignore */ moduleURL) as typeof import('dashjs');
      if (cancelled) return;
      player = MediaPlayer().create();
      player.on(MediaPlayer.events.ERROR, () => { if (!cancelled && !element.readyState) setFailed(true); });
      player.initialize(element, src, true);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; player?.reset(); };
  }, [base, src, dash]);

  useEffect(() => {
    if (kind !== 'video' || paused || !controls) return;
    const timer = setTimeout(() => setControls(false), 3200);
    return () => clearTimeout(timer);
  }, [kind, paused, controls]);
  const toggle = () => {
    const element = video.current;
    if (!element) { setControls(shown => !shown); return; }
    if (element.paused) void element.play().catch(error => { if (error.name !== 'NotAllowedError') setFailed(true); });
    else element.pause();
    setControls(true);
  };
  const command = (cmd: Command) => {
    if (cmd === 'back') close();
    else if (cmd === 'confirm') toggle();
    else if (cmd === 'menu' || cmd === 'details') setControls(shown => !shown);
    else if (cmd === 'left' || cmd === 'right') {
      const delta = cmd === 'left' ? -1 : 1;
      if (kind === 'photo') step(delta);
      else if (video.current && duration) {
        video.current.currentTime = Math.max(0, Math.min(duration, video.current.currentTime + delta * 5));
        setControls(true);
      }
    } else if (cmd === 'up' || cmd === 'down') step(cmd === 'up' ? -1 : 1);
  };
  useImperativeHandle(ref, () => ({ command }));
  const gestures = useBrowserGestures(command);
  const setLength = () => setDuration(Number.isFinite(video.current?.duration) ? video.current!.duration : 0);
  return <div className="xmb-viewer" role="dialog" aria-modal="true" aria-label={file.title}
    onMouseMove={() => setControls(true)} onMouseDown={e => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}>
    <div className="xmb-viewer-image" {...gestures} onClick={() => setControls(value => !value)}>
      {kind === 'photo'
        ? <img src={src} alt={file.title} draggable={false} onError={() => setFailed(true)} />
        : <video ref={video} src={dash ? undefined : src} autoPlay playsInline preload="auto"
            onLoadedData={() => setFailed(false)} onLoadedMetadata={setLength} onDurationChange={setLength}
            onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onPlay={() => setPaused(false)}
            onPause={() => { setPaused(true); setControls(true); }} onError={() => setFailed(true)} />}
    </div>
    {failed && <p className="xmb-viewer-error" role="alert">{t.mediaFailed}</p>}
    {(controls || failed) && <>
      <div className="xmb-viewer-heading"><span>{file.title}</span><button tabIndex={-1} onClick={close}>‹ &nbsp;{t.back}</button></div>
      <div className="xmb-viewer-controls">
        {kind === 'photo' ? <>
          <button disabled={!previous} tabIndex={-1} onClick={() => step(-1)}>‹ &nbsp;{t.previous}</button>
          <button disabled={!next} tabIndex={-1} onClick={() => step(1)}>{t.next}&nbsp; ›</button>
        </> : <>
          <button tabIndex={-1} onClick={toggle}>{paused ? t.play : t.pause}</button>
          <span>{minutes(time)}</span>
          <input type="range" aria-label={t.seek} tabIndex={-1} min={0} max={duration || 1} step="any" value={Math.min(time, duration)}
            disabled={!duration} onChange={event => { if (video.current) video.current.currentTime = Number(event.target.value); }} />
          <span>{minutes(duration)}</span>
        </>}
      </div>
    </>}
  </div>;
});
