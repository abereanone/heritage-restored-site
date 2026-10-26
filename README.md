# Heritage Restored

Static Astro 7 site for [heritagerestored.org](https://heritagerestored.org). Cloudflare Pages builds it from GitHub; pushing to `main` is what makes a change live. Working rules for AI assistants (never push or deploy unasked, no content or design suggestions) are in [`CLAUDE.md`](CLAUDE.md).

## Setup

```bash
npm install
npm run dev
```

Requires Node.js 22.22.0+ (`.node-version` pins 22).

## Scripts

| Script                              | What it does                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev` / `build` / `preview` | Astro dev server, production build to `dist/`, local preview of the build. `dev` and `build` run `build:bible` first.                                                                                                                                                                                  |
| `npm run build:bible`               | Runs `scripts/build-bible-cited.mjs`: scans `src/pages`, `components`, `layouts`, `utils` and `data` for Bible references and writes the verse text they need (from `bsb-data-pipeline/bsb.json`) to `src/generated/bible-cited.json` for the hover tooltips. The output is generated and git-ignored. |
| `npm run seed:bsb`                  | Normalises `bsb-data-pipeline/bsb.json` in place (see `bsb-data-pipeline/README.md`). Rarely needed.                                                                                                                                                                                                   |
| `npm run check`                     | Runs `scripts/check-output.mjs` against an existing `dist/`: no mis-linked verse references, hidden people not rendered, referenced assets exist. Each check exists because that bug once shipped.                                                                                                     |
| `npm run verify`                    | `build` then `check`. Use before pushing.                                                                                                                                                                                                                                                              |
| `npm run format` / `format:check`   | Prettier, write or check only.                                                                                                                                                                                                                                                                         |

## Where things are

- `src/pages/` - one `.astro` file per page (home, beliefs, people, resources, conference, contraceptives, AI/IVF, donate, contact).
- `src/data/` - `people.json`, `resources.json`, `contraceptives.json`. `data-exports/*.csv` are spreadsheet exports of the same lists; nothing reads them at build time.
- `src/components/` - shared components plus `bookMap.json` and `chapterCounts.json` used for verse linking.
- `public/` - static files copied as-is.
- `.github/workflows/ci.yml` - CI: format check and build.
