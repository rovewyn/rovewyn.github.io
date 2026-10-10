import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { blogPublishing } from './build/blog.js';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/',
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: {
        room: fileURLToPath(new URL('./index.html', import.meta.url)),
        blog: fileURLToPath(new URL('./blog/index.html', import.meta.url)),
        legacyArticle: fileURLToPath(new URL('./writing/substrate-browser/index.html', import.meta.url)),
      },
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: 'three-core', test: /three\/build\/three\.core\.js$/ },
            { name: 'three-renderer', test: /three\/build\/three\.module\.js$/ },
          ],
        },
      },
    },
  },
  plugins: [blogPublishing(root), {
    name: 'development-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      // Vite injects development styles and opens a local HMR connection.
      return html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
    },
  }],
});
