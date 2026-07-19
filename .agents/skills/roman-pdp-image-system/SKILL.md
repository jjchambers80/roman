---
name: roman-pdp-image-system
description: Create and organize reusable Roman Skin enhanced Shopify product-detail images from verified product packshots, existing product copy, and competitor references. Use for Roman PDP image cards, secondary product images, product infographics, benefit cards, ingredient cards, usage cards, lifestyle cards, and repeated catalog image production where packaging fidelity, white backgrounds, Roman branding, centralized assets, and claim-safe copy are required.
---

# Roman PDP Image System

Create 2048 x 2048 Roman Skin PDP image cards while preserving the real product image and using only verified Roman copy.

## Required workflow

1. Resolve the repository root and product handle.
2. Read `references/specification.md` completely.
3. Run `scripts/prepare-product-assets.sh <product-handle>`.
4. Put the verified original packshot in `source/` and competitor inspiration in `references/`.
5. Read current branding from `config/settings_data.json` and product copy from live Shopify data or the repository sources listed in the product context.
6. Create or update `product-context.json` before generating.
7. Analyze competitor references for general hierarchy, spacing, and visual devices. Never copy competitor branding, copy, or distinctive trade dress.
8. Treat the product packshot as immutable. Never use generative AI to redraw, restyle, relight, rotate, extend, or recreate the product, logo, label, pump, cap, container, product color, packaging text, or reflections.
9. Use AI only for non-product decorative elements when needed. Assemble the verified packshot and final copy deterministically in the design template.
10. Save iterations to `drafts/`. Promote only an approved, validated image to `final/`.
11. Report final absolute paths.

## Hard rejection rules

Reject an image if any condition is true:

- The product logo, label, printed text, symbol, packaging, proportions, cap, pump, container, product color, or reflections differ from the verified source.
- The background is not pure white `#FFFFFF`.
- The image contains invented or competitor-derived copy.
- The image contains a claim absent from verified product copy.
- The font is not Harmonia Sans or an explicitly approved future replacement read from active theme settings.
- Colors fall outside the active Roman palette unless they are present in the verified product packshot.
- Critical content falls outside the 160 px safe zone.
- Text is unreadable when previewed at 375 x 375 px.
- The output is not 2048 x 2048 px in sRGB.

Do not move a rejected image into `final/`. Record its filename and rejection reasons in `product-context.json`.

## Copy rules

Use existing copy associated with the selected product. Prefer sources in this order:

1. Live Shopify product title, description, and product metafields.
2. `custom.product_benefits`.
3. `custom.tab_description`, `custom.tab_usage`, and `custom.tab_ingredients`.
4. Product-specific repository copy already synced to Shopify.
5. User-provided approved copy.

Shorten copy only for readability and preserve qualifiers such as `helps`, `supports`, and `appearance of`. Never invent ingredients, efficacy, timing, clinical proof, certifications, or results. Stop and report missing or conflicting copy.

## Storage contract

Store every project-bound image under:

```text
assets/pdp-enhanced/products/<product-handle>/
  product-context.json
  source/
  references/
  drafts/
  final/
```

Never leave project assets only in a temporary directory, download directory, generation-service location, or skill folder.

## Output sequence

Use deterministic lowercase filenames:

```text
<handle>-01-hero.png
<handle>-02-benefits.png
<handle>-03-ingredients.png
<handle>-04-texture.png
<handle>-05-how-to-use.png
<handle>-06-routine.png
<handle>-07-trust.png
```

Create only the cards requested. Do not manufacture content to fill the sequence.
