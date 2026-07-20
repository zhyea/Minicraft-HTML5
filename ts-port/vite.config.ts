/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Phase-0 vertical slice build config.
// Tests run under vitest. The engine/game unit tests stay in the default
// 'node' environment; UI component tests opt into jsdom via the
// `// @vitest-environment jsdom` pragma at the top of their files.
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5172,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Skip the destructive emptyDir sweep so the sandbox bulk-delete guard
    // never blocks the build. The only deletes Vite performs are its
    // temp-config cleanup, which is caught/safe. Re-enable (emptyOutDir: true)
    // once the sandbox grants delete permission for a pristine dist wipe.
    emptyOutDir: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
