# Abadis — «نجات زاگرس» CSR page with Zagros oak scroll hero (prototype)

This is the approved CSR page (`redesign/csr/`), copied verbatim: text, images, order, styling and behaviour, with
`site.css`/`site.js` under `./assets/`. The only addition is a pinned, scroll-scrubbed Zagros scene that serves as the
hero background behind the page's own `.csr-hero` section.

Live: https://abadismedit.github.io/abadis-zagros-hero/

- Scene: dry land, then acorns fall (with contact shadows), sprout, sapling, young oak and grown oak at perspective-scaled
  spots. The background goes dry, mid, then green, and at the end the canister rises. Progress is smoothed with a rAF lerp and
  works in both directions. Only transform and opacity are animated.
- iOS Safari: the stage uses `100lvh`, bottom UI is offset by `100lvh - 100svh`, and there is no `background-attachment: fixed`.
- Themes: the template's own switch (روشن / تیره / نوآر), persisted in `localStorage` (`abadis-theme`). It defaults to the
  system colour scheme when nothing is stored. Night mode applies an evening grade over the scene (plain alpha layer, no filters).
- `prefers-reduced-motion`: the final scene is shown statically.
- Art pre-processing (no runtime filters): `tools/tint.py` (greener oaks), `tools/grade.py` (acorn, sprout, sapling and canister
  graded to the painted, dusty palette), `tools/build_assets.py` (WebP + JPG/PNG fallbacks).
  `tools/assemble.py` rebuilds `index.html` from the original CSR HTML.
- Kalameh is loaded from the template host (commercial font, not redistributed). Artwork by Designer.
