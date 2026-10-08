# Repository Guidelines

## Project Structure & Module Organization

This repository contains rovewyn's static personal website. All site files live at the repository root:

- `index.html`: page content, semantic markup, metadata, and the GitHub profile link.
- `styles.css`: theme variables, layout, responsive rules, and accessibility styles.
- `favicon.svg`: the site icon.
- `.nojekyll`: disables Jekyll processing for GitHub Pages.

There are no application modules, dependency manifests, test directories, or generated assets. Edit the source files directly.

## Build, Test, and Development Commands

The site requires no build step or dependency installation. Serve the repository root with Python 3:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000` and refresh after edits. Use another port if 8000 is occupied. Stop the server with `Ctrl+C`.

Run `git diff --cached --check` before committing to detect whitespace errors in staged changes.

## Coding Style & Naming Conventions

Use two-space indentation in HTML, CSS, and SVG. Keep markup semantic, attributes double-quoted, and CSS declarations terminated with semicolons. Use descriptive, kebab-case class names and custom properties, such as `.profile-link` and `--accent`.

Prefer the existing theme variables and keep responsive layouts usable. Keep the nickname `rovewyn` lowercase and without spaces in visible content, metadata, and accessible labels. No formatter or linter is configured; match the surrounding code.

## Testing Guidelines

No automated testing framework or coverage target is configured. For page changes, start a temporary local server and check the affected content or behavior in a browser. For layout changes, check desktop and mobile widths. Open the preview for the user and share its local URL.

Keep the preview server running until any condition is met:

- The user confirms they have finished previewing.
- The user asks to stop it.
- This work is complete: its changes were successfully pushed to remote `main`, or its pull request was merged.

Local verification alone does not end the preview session.

## Commit & Pull Request Guidelines

Use Conventional Commits for commit messages and pull request titles, such as `feat: initialize rovewyn personal site` or `fix: prevent mobile heading overflow`.

Keep commits focused. Pull requests should briefly explain the change and its purpose. For page changes, summarize the local preview result. Link an issue when applicable.

## Security & Configuration

When adding scripts, inline styles, or external assets, review and update the Content Security Policy as needed. Never commit credentials or machine-specific configuration.
