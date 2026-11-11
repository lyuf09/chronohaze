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
- `npm run check:static` refreshes generated artifacts, then runs the static consistency checks.
- `CHRONOHAZE_SKIP_GENERATED_BUILD=1 npm run check:static` runs only the static checks when generated artifacts are already current.
- `npm run check:all` runs the generated/static checks, structured-data Playwright check, and runtime Playwright smoke test. Install npm dependencies first when running the Playwright checks locally.
