# Roman PDP image specification

## Canvas

- Size: 2048 x 2048 px
- Aspect ratio: 1:1
- Color profile: sRGB
- Required background: pure white `#FFFFFF`
- Safe zone: 160 px on all sides
- Graphic export: PNG-24
- Photographic export: high-quality JPEG only when no typography, transparency, or line art is present

## Brand

- Read active fonts and colors from `config/settings_data.json` on every run.
- Current heading and body font: Harmonia Sans.
- Current approved palette: `#6D796E`, `#FFFFFF`, `#121212`, and `#000000`.
- Use product-specific colors only when they occur in the verified packshot or an approved product context override.

## Immutable product rule

Place the verified source packshot without generative transformation. Preserve every source pixel except deterministic background removal or uniform scaling when explicitly required. Do not reconstruct the product from a reference image.

Never change:

- logo or brand marks
- label typography or wording
- symbols, punctuation, size, or volume text
- bottle, jar, tube, cap, pump, or dispenser geometry
- serum or product color
- packaging proportions, transparency, highlights, or reflections

If a tool redraws any product area, reject the output.

## Typography minimums on the 2048 px canvas

- Primary headline: 104 px minimum; prefer 112-144 px
- Secondary headline: 76 px minimum
- Body and benefit copy: 60 px minimum
- Ingredient labels: 54 px minimum
- Avoid fine print; never go below 42 px

Preview at 375 x 375 px before approval.

## Claim safety

Use only verified product copy. Competitor references may inform hierarchy and composition but never claims, copy, branding, results, clinical language, or timeframes.
