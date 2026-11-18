// Decky version: media, battery and health reports come from the Python backend (main.py).
import { callable } from '@decky/api';
import type { MediaKind, MediaLibrary, Status } from './model';
import { createHealthReporter } from './health';
import { createSteamPlatform } from './steam';

const reportHealth = callable<[event: string, value: string | number], void>('report_health');
const health = createHealthReporter((event, value) => { void reportHealth(event, value).catch(() => {}); });
export const flushInputReport = health.flushInput;

export const steamPlatform = createSteamPlatform({
  report: health.report,
  media: callable<[kind: MediaKind], MediaLibrary>('get_media'),
  status: callable<[], Status>('get_status'),
});
