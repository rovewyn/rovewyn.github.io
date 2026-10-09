# Repository Guidelines

## Project Structure & Module Organization

This repository contains rovewyn's static personal website, built with Vite and Three.js:

- `index.html`: semantic content, metadata, accessible controls, and dialogs.
- `styles.css`: theme, layout, responsive rules, and accessibility styles.
- `src/main.js`: interface state and shared interaction commands.
- `src/scene.js`: procedural room, rendering, camera, picking, and scan effects.
- `src/city.js`: procedural near and middle-distance towers, elevated routes, and animated traffic.
- `src/neon-signs.js`: original fictional glyphs and physical neon signage.
- `src/traffic.js`: additional rail, road, and airborne vehicles.
- `src/ground-traffic.js`: ground streets, lighting, and animated road vehicles.
- `src/air-traffic.js`: original aircraft fleets and air corridors.
- `src/devices.js`: procedural desktop devices and scan-node placement.
- `src/audio.js`: procedural, user-activated Web Audio ambience.
- `favicon.svg`: the site icon and personal mark.
- `assets/`: original and delivery images with exact generation prompts and disclosed parameters.
- `tests/` and `playwright.config.js`: browser acceptance checks.
- `vite.config.js`: build and development-only CSP handling.
- `.github/workflows/pages.yml`: checks and prepared Pages deployment.

Dependencies are locked with npm. `dist/`, `node_modules/`, and browser test outputs are generated and ignored.

## Build, Test, and Development Commands

Use Node.js 24. Install with `npm ci`, then start `npm run dev` and open its printed Local URL.

Preview the production build:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`. Use another port if 4173 is occupied. Stop the server with `Ctrl+C` when the preview lifecycle allows it.

Run browser checks against the production build:

```sh
npx playwright install chromium
npm run build
npm test
```

Run `git diff --cached --check` before committing to detect whitespace errors in staged changes.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, SVG, and JavaScript. Keep markup semantic, attributes double-quoted, and CSS declarations terminated with semicolons. Use descriptive, kebab-case class names and custom properties.

Prefer existing theme variables and keep responsive layouts usable. Keep the nickname `rovewyn` lowercase and without spaces in visible content, metadata, and accessible labels. Match the surrounding code; no formatter or linter is configured.

Route canvas picking and HTML controls through the same interaction commands. Keep essential content in HTML. Dispose Three.js and audio resources when their owner is torn down. All visits start muted.

Keep each retained generated image's exact prompt, tool parameters, output metadata, checksums, and integration notes beside the asset. Preserve its original source output. Remove unused assets and intermediate design records. Do not invent unexposed model names, versions, or seeds.

## Testing Guidelines

For page changes, run a local production preview and check the affected behavior in a browser. Check desktop and mobile widths for layout changes. Open the preview for the user and share its local URL. Keep browser tests focused on user paths; use manual visual QA for scene composition. Emulated mobile or software-rendered results are not physical-device performance evidence.

Keep the preview server running until any condition is met:

- The user confirms they have finished previewing.
- The user asks to stop it.
- This work is complete: its changes were successfully pushed to remote `main`, or its pull request was merged.

Local verification alone does not end the preview session.

## Git Workflow & Cleanup

Use `codex/` feature branches during development. After merging a PR, remove both its local and remote feature branches:

1. Confirm the PR is merged and neither branch contains new or unmerged work; delete the remote feature branch.
2. Run `git fetch --prune origin`.
3. Switch away from the local feature branch. Primary clones may use `git switch main`, then `git merge --ff-only origin/main`; linked worktrees must use `git switch --detach origin/main`.
4. Delete the local feature branch after switching away, then verify that both feature branches are gone.

These checkout requirements apply to post-merge cleanup. Preserve uncommitted changes and branches used by other worktrees. For squash merges, verify that all branch changes are present in `origin/main` before forcing local branch deletion.

## Commit & Pull Request Guidelines

Use Conventional Commits for commit messages and pull request titles. Keep commits focused. Pull requests should explain the change and purpose, summarize the local preview result, and link an issue when applicable.

## Security & Configuration

Review the Content Security Policy when changing scripts, styles, or assets. Keep production resources same-origin; do not widen production policy to accommodate development-only HMR. Never commit credentials or machine-specific configuration.

The Vite build must be published from `dist/` using GitHub Actions. Changing the repository's Pages source and publishing are release steps separate from local implementation.
