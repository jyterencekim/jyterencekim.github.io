# jyterencekim.github.io

Personal blog for JY Terence Kim, rebuilt with [Astro](https://astro.build/) using the AstroPaper theme.

## Requirements

- Node.js **20.19.0** or newer (Astro 5 requires at least Node 18.20.8, but Node 20 is recommended).
- npm 9.6+ (ships with Node 20).

## Getting started

```bash
npm install
npm run dev
```

The development server runs on <http://localhost:4321>. Content lives in `src/data/blog`, grouped by folder (`thoughts`, `scraps`, `misc`, `dev`, etc.). Static pages such as `quotes` and `taste` are stored inside `src/pages`.

## Useful scripts

- `npm run dev` – start the dev server with hot reload.
- `npm run build` – type-check, build, run Pagefind, and prepare production assets in `dist/`.
- `npm run preview` – preview the built site locally.
- `npm run lint` – run ESLint across the project.
- `npm run format` – apply Prettier formatting rules.

## Deployment

The repository ships with `.github/workflows/deploy.yml`, which builds on pushes to `master` and deploys the static output to GitHub Pages. In the repository settings, set **Pages → Source** to “GitHub Actions” if it is not already.

If you need to regenerate the posts from legacy Jekyll content, run:

```bash
python3 scripts/migrate_posts.py
```

This will rebuild the Markdown files under `src/data/blog` from `_posts/` (keep a backup before running if you have manual edits).
