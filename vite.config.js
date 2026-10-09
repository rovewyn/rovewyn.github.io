import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    assetsInlineLimit: 0,
    rolldownOptions: {
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
  plugins: [{
    name: 'development-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      // Vite injects development styles and opens a local HMR connection.
      return html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
    },
  }],
});
