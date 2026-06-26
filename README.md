# ChronoHaze

Static multi-page personal website.

## Current Routes
- `/photography.html`
- `/music.html`
- `/academic.html`
- `/search.html`
- `/cv.html`

## Assets
- `assets/logo.png`
- `assets/audio/HaMfin.wav`
- `assets/photos/placeholder.svg`

## Local Checks
- `npm run build:generated` refreshes catalogs, search data, media manifests, rendered page blocks, and minified assets.
- `npm run check:static` runs the static consistency checks after generated artifacts are current.
- `npm run check:all` runs the generated build, static checks, structured-data Playwright check, and runtime Playwright smoke test. Install npm dependencies first when running the Playwright checks locally.
