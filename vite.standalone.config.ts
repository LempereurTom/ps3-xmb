// Builds the Millennium version of the XMB: one self-contained script, ps3/xmb.js,
// loaded by the theme into the Big Picture window.  npm run build:millennium
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@decky/ui': path.resolve('src/standalone/decky-ui-shim.ts') } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'desktop-theme/PS3-XMB/ps3',
    emptyOutDir: false,
    target: 'chrome110',
    minify: true,
    sourcemap: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: { entry: 'src/standalone/main.tsx', formats: ['iife'], name: 'PS3XMB', fileName: () => 'xmb.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
