# Abadis — Zagros oak scroll hero (prototype)

Standalone prototype of a scroll-scrubbed hero for the Abadis Med website («هر مخزن، یک بلوط برای زاگرس»).
For review only, not final integration.

Live: https://abadismedit.github.io/abadis-zagros-hero/

- Sticky full-screen stage on a 400vh track. Scroll progress is smoothed with a rAF lerp and works in both directions.
- Dry land, then acorns fall at several spots (perspective-scaled), then sprout, sapling, young oak and grown oak (staggered crossfades). The background goes dry, mid, then green. At the end the canister rises with the final headline.
- Only `transform` and `opacity` are animated. No `background-attachment: fixed`. The stage uses `100lvh` and bottom UI is offset by `100lvh - 100svh`, so iOS Safari toolbars never cause a resize or jump.
- `prefers-reduced-motion: reduce` shows the final state statically.
- Trees were tinted greener offline (`tools/tint.py`; no runtime CSS filters). Images are WebP with JPG/PNG fallbacks (`tools/build_assets.py`).
- Font: Kalameh, loaded from the approved template's font source, with Vazirmatn as fallback.
- Artwork by Designer.
