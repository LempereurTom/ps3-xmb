import decky from '@decky/rollup';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The Decky ZIP ships one JavaScript bundle. Support the same WAV imports as Vite.
export default decky({
  plugins: [{
    name: 'inline-xmb-sounds',
    resolveId(id, importer) {
      if (importer && id.endsWith('.wav?inline')) return path.resolve(path.dirname(importer), id);
    },
    async load(id) {
      if (!id.endsWith('.wav?inline')) return null;
      const filename = id.slice(0, -'?inline'.length);
      this.addWatchFile(filename);
      const bytes = await readFile(filename);
      return `export default "data:audio/wav;base64,${bytes.toString('base64')}"`;
    },
  }],
});
