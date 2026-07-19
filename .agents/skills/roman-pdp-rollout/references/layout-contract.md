# Enhanced PDP Layout Contract

Use the Vitamin C alternate template as an unassigned visual and behavioral reference, not as a one-shot rollout mandate. Move the shared default PDP toward this target one approved section release at a time, and populate every product from its own approved evidence.

Only the section named in the current release manifest is in scope. Requirements for other sections describe the eventual target state and must not be bundled into that release.

## Section order

1. Main product purchase area
2. Why this formula
3. Frequently Bought Together
4. Real Results, Real Clients
5. Why it earns a place in your routine — optional; omit cleanly when product-specific value evidence is insufficient
6. Product-specific FAQ
7. Reviews: Judge.me in production, or an approved verified-testimonial fallback during development when the app cannot render
8. Related products
9. Existing commercial video

Do not move Frequently Bought Together into the purchase column. It must immediately follow “Why this formula.”

## Main purchase area

Render in this order:

1. Product eyebrow with verified category and dynamic or verified size
2. Quiet Share action paired with the eyebrow
3. Single product H1
4. Product-specific value proposition
5. Three approved benefit bullets
6. Dynamic price and native payment terms
7. Primary Add to Cart with dynamic variant price when enabled
8. Compact shipping and guarantee reassurance
9. Description, usage, and ingredients accordions

Omit the quantity-selector block. Shopify submits one by default. Preserve unavailable and sold-out labels. Do not hard-code installment amounts.

Keep the mobile sticky Add to Cart available without duplicating the visible native CTA. Distinguish main and sticky CTA analytics. Keep the desktop sticky card compact and show price only once when the CTA already includes it.

## Gallery

- Preserve desktop thumbnails and lightbox behavior.
- On mobile, use a left-to-right swipeable carousel with a visible `n of total` counter instead of thumbnails.
- Remove avoidable vertical whitespace around product media.
- Use supplemental gallery blocks without attaching development assets as product media.
- Invoke `roman-pdp-image-system` for asset creation and validation.
- Require real photography for product texture, packaging interaction, and face or décolleté application. Never use AI to redraw or alter the product.

## Persuasion sections

- Build “Why this formula” from approved ingredient-role evidence; ingredient presence alone does not substantiate a benefit.
- Keep Frequently Bought Together behavior and discount logic intact.
- Use only product-specific, source-verified testimonials in Real Results. Preserve exact wording and attribution and include an approved variability disclaimer.
- If included, let “Why it earns a place in your routine” cover only evidenced formulation, format, versatility, professional expertise, and policy value. Avoid superiority or guaranteed outcomes.
- Render product-specific FAQs with one H2 and only approved answers in FAQ JSON-LD.

## Review handling

- Keep Judge.me as the production review system and confirm its widget and core app embed before launch.
- If the development theme cannot initialize Judge.me, render verified, consented testimonials without stars, aggregate ratings, review counts, Judge.me branding, or review schema.
- Record Judge.me enablement as a production-launch dependency. Do not modify review data as part of theme rollout.

## Responsive and functional verification

Check desktop, tablet, 390px, and 375px layouts for:

- one H1 and no horizontal overflow;
- visible primary CTA and correct sticky behavior;
- quantity defaulting to one;
- available, sold-out, and unavailable variants;
- dynamic checkout, Shop Pay terms, cart drawer updates, and bundle failures;
- gallery counter, swipe, thumbnails, lightbox, alt text, and focus behavior;
- Share native action and copy-link fallback;
- shipping and guarantee dialogs, close controls, Escape, and focus restoration;
- FAQ interaction and JSON-LD;
- consent-compatible analytics firing once per action with no PII.

Run `node scripts/check-theme-integrations.js` during development. Before production, run `REQUIRE_JUDGEME=1 node scripts/check-theme-integrations.js` so a missing or disabled Judge.me core embed fails the launch check. Also run `shopify theme check` and relevant performance checks. Preserve the existing Lighthouse budgets: performance >= 0.80, accessibility >= 0.90, and SEO >= 0.90.
