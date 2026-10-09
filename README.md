# rovewyn

An interactive, rain-lit workspace for **rovewyn** in a city that never sleeps.

Curious by nature. Building useful things with code.

[Visit the website](https://rovewyn.github.io/) · [GitHub](https://github.com/rovewyn)

## The Room

- An unlit Three.js workspace with one external monitor, a Mac mini, an open MacBook Pro on the left, and a modeled wireless mouse. Cyan screen light and small lime accents echo the `#D8F36A` mark. Only screens and light from the window illuminate the room.
- A procedural skyline with 65 buildings in five depth rows and 2,982 window instances. Windows use ordinary warm-white and pale-yellow light. Three framed neon signs use fictional glyphs with no language or meaning mapping.
- Ground streets with moving cars and vans, two trains, elevated road traffic, and six air corridors add activity. Air taxis, passenger shuttles, cargo lifters, and courier drones have distinct silhouettes and speeds. The background image contains only night sky and clouds; every visible building and vehicle is procedural 3D geometry.
- Select **Open profile**, the main monitor, or **About** to open the introduction.
- Enable **Scan**, then trace the unknown signal to find the hidden node.
- Enable **Sound off** to hear procedural rain, equipment hum, and distant trains. Every visit starts muted.
- Close a panel with **Return to room** or Escape. Keyboard and touch controls provide the same actions.

The room uses original procedural geometry, canvas textures, an original generated sky image, and Web Audio synthesis. All runtime assets are served from this site. It has no third-party model, font, image, or audio downloads, backend, analytics, or account requirement.

The sky image's exact prompt, disclosed tool parameters, source output, compression command, metadata, and checksums are recorded in [assets/night-sky.prompt.md](assets/night-sky.prompt.md). The sky is mapped onto a world-space dome, shared by the same camera as the buildings. Static fallback uses the same sky image. Scene composition, palette, traffic, devices, and lighting are documented in [assets/world.scene.md](assets/world.scene.md).

## Local Development

Requires Node.js 24 and npm. Install the locked dependencies, then start Vite:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. To preview the production build, including its strict Content Security Policy:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/). Keep the preview running until the user has finished previewing, asks to stop it, or the change has been pushed to remote `main` or merged. Local verification alone does not end the preview session.

## Verification

```sh
npx playwright install chromium
npm run build
npm test
```

Playwright checks three user paths in desktop and emulated phone contexts: profile and Scan interaction, muted-by-default sound with an opt-in toggle, and access to the introduction and GitHub link without JavaScript. Checks use reduced motion so continuous software rendering does not compete with interface actions; inspect normal animation in the browser preview. Failed checks save a screenshot and trace in the ignored `test-results/` directory.

For visual QA, check 1440×900, 768×1024, 390×844, and 320×568. Inspect normal and scan modes, panel return focus, reduced motion, and sound controls. In browser developer tools, the canvas's `data-fps` attribute contains a rolling frame-rate sample while animation is running; record the browser, viewport, and actual device with any measurement.

Reduced motion stops ambient animation and camera parallax. Hidden pages pause rendering and suspend audio. WebGL failure or context loss switches to the static theme; the introduction and GitHub link also work without JavaScript. High-contrast mode uses the static page.

## Source Layout

- `index.html` and `styles.css`: semantic content, responsive interface, dialogs, and fallback theme.
- `src/main.js`: shared interaction state and accessible controls.
- `src/scene.js`: room construction, camera, picking, scan, rendering, and resource cleanup.
- `src/city.js`: near and middle-distance buildings, elevated routes, and animated traffic.
- `src/neon-signs.js`: sign housings, brackets, luminous borders, and fictional glyph textures.
- `src/traffic.js`: additional elevated railway, road vehicles, and air traffic.
- `src/ground-traffic.js`: street surfaces, curbs, lane paint, lamps, cars, and vans.
- `src/air-traffic.js`: four original aircraft models and six animated corridors.
- `src/devices.js`: Mac mini, MacBook Pro, wireless mouse, and relocated scan node.
- `src/audio.js`: user-activated procedural ambience.
- `favicon.svg`: the site and workstation mark.
- `assets/`: original generated images, optimized delivery images, generation records, and scene parameters.
- `tests/`: browser acceptance checks.
- `vite.config.js`: static build and development-only CSP adjustments.
- `.github/workflows/pages.yml`: checks and prepared GitHub Pages publication.

Production CSP allows same-origin scripts, styles, images, and fonts. Vite emits assets as separate files to avoid CSP-blocked data URLs. The development server alone permits Vite's injected styles and local HMR WebSocket. Do not copy that relaxed policy to production.

## GitHub Pages Migration

Select **GitHub Actions** as the repository's Pages source. The workflow checks pull requests, then builds and publishes `dist/` on `main`. The Vite base is `/` for `https://rovewyn.github.io/`. To roll back, deploy a previously working commit through the build workflow.

See [AGENTS.md](AGENTS.md) for contributor guidelines.
