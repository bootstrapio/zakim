# ZAKIM AI Landing Page

Static landing page prepared for GitHub Pages.

## Build

```sh
npm run build
```

The production output is generated in `dist/`. The build keeps source files readable in `public/`, then minifies HTML, CSS, and JavaScript, fingerprints cacheable assets, optimizes the SVG, and compresses the video when `ffmpeg` can safely make it smaller.

## Preview

```sh
npm run build
npm run preview
```

Open `http://localhost:4173/`.

## Publish

GitHub Pages deployment is handled by `.github/workflows/deploy-pages.yml`.
Every push to `main` builds the site and force-publishes only `dist/` to the
generated `prod` branch.

In the GitHub repo, set Pages source to:

- Branch: `prod`
- Folder: `/ (root)`

Then publish by pushing source changes:

```sh
git push origin main
```
