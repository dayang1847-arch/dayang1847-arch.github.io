# Project guidance

This is DC Web, Dayang.Cao's buildless bilingual website for GitHub Pages. Keep the entry files at the repository root and images/icons in `assets/`. Preserve relative asset URLs so the site also works in subdirectory previews.

- Main content: `index.html`; styles: `styles.css`; interactions: `main.js`.
- No npm install, build step, API keys, or environment variables are required.
- Preview with `python3 -m http.server 4173 --bind 0.0.0.0` in cloud environments, or bind to `127.0.0.1` locally.
- Check JavaScript with `node --check main.js`. Verify the page and referenced assets return HTTP 200. Check desktop and mobile layouts and the theme toggle when browser access is available.
- Maintain accessible links, focus styles, Chinese and English content, light/dark color contrast, and reduced-motion support. Keep both language dictionaries in `main.js` aligned; `?lang=zh` and `?lang=en` open each version directly. The user's name is Dayang.Cao and the monogram is DC. Use “DC Web” for the site brand and document title. Keep Dayang.Cao’s English introduction at the end of the page, with awards collapsed by default.
- Do not invent personal history, employment, completed projects, contact information, testimonials, or metrics. Ask for missing factual information when needed.
- Do not add dependencies or migrate frameworks unless the requested behavior needs them.
- GitHub Pages publishes the `main` branch root. Keep `.nojekyll` and do not commit secrets or local preview files.
