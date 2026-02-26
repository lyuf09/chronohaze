# Chronohaze Design System (Working Spec)

This is a lightweight design system for keeping new pages/components visually consistent.

## 1. Typography Scale

- `H1`: `--type-h1-size`, `--type-h1-line`, `--type-h1-weight`
- `H2`: `--type-h2-size`, `--type-h2-line`, `--type-h2-weight`
- `H3`: `--type-h3-size`, `--type-h3-line`, `--type-h3-weight`
- `Body`: `--type-body-size`, `--type-body-line`, `--type-body-weight`
- `Caption`: `--type-caption-size`, `--type-caption-line`, `--type-caption-weight`

Guideline:
- Use serif display for major titles (`H1/H2`) where the page already follows the house style.
- Use sans for controls/forms/status labels.
- Keep body copy weight light; prefer spacing/line-height over heavier weight for emphasis.
- Prefer one visual size per semantic tier on a page family (e.g. all index-page `H2` use the same scale).
- Long-form Chinese body copy should stay in the `1.7–1.9` line-height range.
- Card summaries should be clamped to a fixed number of lines (usually `2` for title, `3` for summary).

## 2. Spacing Scale

Use these tokens for layout rhythm and component spacing:

- `--space-1`: `8px`
- `--space-2`: `12px`
- `--space-3`: `16px`
- `--space-4`: `24px`
- `--space-5`: `32px`
- `--space-6`: `48px`

Guideline:
- Small UI gaps: `8/12`
- Card inner spacing: `16/24`
- Section gaps: `32/48`

## 3. Color Tokens

Core palette is intentionally restrained:

- One main background family (deep gray / graphite for dark surfaces, soft neutral gray for light surfaces)
- One accent family only (low-saturation cool blue / mist blue)
- Neutral grayscale for text, borders, surfaces
- Ink / text: `--color-ink-strong`, `--color-ink`, `--color-ink-muted`
- Lines / borders: `--color-gray-line-soft`, `--color-gray-line-mid`, `--color-gray-line-strong`
- Single accent family: `--color-accent`, `--color-accent-soft`, `--color-accent-halo`

Guideline:
- Keep one accent family for focus/interactive states.
- Prefer “less but precise” color usage; do not introduce page-specific UI blues/greys unless promoted to tokens.
- Divider lines should stay thin + semi-transparent (border opacity first, thickness second).
- Hover state should change brightness/opacity/border strength first, not hue.
- Use artwork-specific colors inside content (e.g. lyric panels), not in global controls.

## 4. Buttons (Three Types)

Base primitive:

- `.ui-btn`

Variants:

- `.ui-btn.ui-btn--primary`
- `.ui-btn.ui-btn--secondary`
- `.ui-link` (text link)

Guideline:
- Primary: page CTA only (1–2 max per viewport)
- Secondary: utility actions
- Text link: inline navigation / metadata links
- Button labels should stay in one tone family per page: avoid mixing highly poetic and highly system-like wording in the same control cluster.

## 5. Cards

Base primitive:

- `.ui-card`

Variants:

- `.ui-card.is-sharp` for intentionally sharp-edged layouts (e.g. music list rows)

Guideline:
- Default card radius is controlled by `--card-radius`
- Use sharp cards selectively for pages with a more “edged” tone (music index/album rows)

## 6. Interaction / Focus

- Focus ring must use `--ui-focus-ring`
- Hover should change **one** of: border, background, shadow (avoid changing everything aggressively)
- Micro-interaction timing target: `150–220ms`
- Motion amplitude target: `2–4px` max for lift/offset, no spring-like bounce for primary UI
- Motion should degrade under `prefers-reduced-motion`

Recommended micro interactions:
- Card hover: lift `1–2px`, shadow one level up
- Image hover: zoom `1.01–1.03`
- Button hover: opacity/brightness + subtle border/shadow adjustment
- Text reveal: quick fade/short translate only

Avoid:
- Large directional slides
- Strong bounce/spring easing
- Multiple simultaneous dramatic property changes

## 6.1 Font Pairing (Brand-level)

- Display / editorial titles: serif (`--font-serif`, page-specific serif display family allowed if consistent)
- Body / UI text: clean sans (`--font-sans` or page-specific UI sans)

What creates “premium” feel is usually not decorative font choice, but:
- weight contrast (`Light / Regular / Medium`)
- consistent letter-spacing by tier
- consistent line-height by tier
- not mixing too many font voices in the same control cluster

## 7. Current Source of Truth

Primary tokens live in:

- `/tmp/chronohaze-engineering-pass2/styles.css` (Design-system token block near the end of the file)

When adding a new page:

1. Reuse existing tokens/components first
2. Add page-specific styles after checking whether the pattern is actually reusable
3. If reusable, promote to token/primitive and update this file
