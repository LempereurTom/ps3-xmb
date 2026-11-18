// Samples from the bundled PSP Sounds pack by SGL-Galaxy.
import navigation from '../PSP Sounds/deck_ui_navigation.wav?inline';
import activation from '../PSP Sounds/deck_ui_default_activation.wav?inline';
import back from '../PSP Sounds/deck_ui_hide_modal.wav?inline';

// In this pack the tab and fly-in WAVs match activation, and fly-out matches back.
const samples = { move: navigation, enter: activation, back, category: activation, menuOpen: activation, menuClose: back };
type SoundKind = keyof typeof samples;
let context: AudioContext | undefined;
let playing: AudioBufferSourceNode | undefined;
let request = 0;
const decoded = new Map<string, Promise<AudioBuffer>>();

function loadSample(audio: AudioContext, dataURL: string) {
  let pending = decoded.get(dataURL);
  if (!pending) {
    const binary = atob(dataURL.slice(dataURL.indexOf(',') + 1));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    pending = audio.decodeAudioData(bytes.buffer);
    decoded.set(dataURL, pending);
  }
  return pending;
}

export async function playSound(kind: SoundKind, enabled: boolean) {
  const currentRequest = ++request;
  if (!enabled) return;
  try {
    const audio = context ??= new AudioContext();
    const [buffer] = await Promise.all([
      loadSample(audio, samples[kind]),
      audio.state === 'suspended' ? audio.resume() : undefined,
    ]);
    if (currentRequest !== request) return;
    playing?.stop();
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.onended = () => {
      source.disconnect();
      if (playing === source) playing = undefined;
    };
    playing = source;
    source.start();
  } catch { /* Steam can suspend audio while switching applications. */ }
}

export function closeSound() {
  request++;
  playing = undefined;
  decoded.clear();
  void context?.close().catch(() => {});
  context = undefined;
}
