import { defineConfig } from 'vite';

// Served from https://<user>.github.io/mad-models/
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      // lab.html: an unlisted Model Lab for trying GPT-1 and GPT-2 directly
      input: { main: 'index.html', lab: 'lab.html' },
    },
  },
  worker: { format: 'es' },
  // The model files are large binaries; never inline or hash them.
  assetsInclude: ['**/*.onnx'],
});
