# Subscribe & Save — Design Spec

**Status:** Parked — not yet in active development  
**Date:** 2026-04-08

---

## Overview

Add a Subscribe & Save purchasing option to all product detail pages on the Roman Skin Care Shopify store. Customers choose between a one-time purchase and a recurring subscription with a discount and free shipping.

---

## Goals

- Give customers an incentive to subscribe (10% off + free shipping)
- Apply to all products in the store
- Match Roman Skin Care branding exactly (no off-brand app widgets)
- Keep recurring app costs at $0 during startup phase

---

## UI Spec (per screenshot reference)

The product form gains a purchase-type selector above the Add to Cart button:

```
[ ● ] One-Time Purchase
      $XX.XX

[ ○ ] Subscribe & Save   [10% OFF + FREE SHIPPING]
      $XX.XX (discounted price in brand color)
      ✓ Get 10% off every order
      ✓ Free shipping on all subscription orders
      ✓ Modify, pause, skip, or cancel anytime

      Deliver Every  [ 4 weeks (Most Popular) ▾ ]
                       6 weeks
                       8 weeks
```

- Subscribe option is a secondary radio card (outlined, light background when unselected)
- Benefits list and frequency dropdown only visible when Subscribe is selected
- "Add to Cart" submits either a one-time or subscription line item depending on selection
- Branding: use theme color schemes (white/light gray backgrounds, #121212 text, olive/brand button color)

---

## Technical Approach

### Why a hybrid (custom UI + free app) is required

Shopify does not natively process recurring payments without an app. The **Selling Plans API** (built into Shopify since 2020) provides the data layer — selling plans define the discount and frequency options and are attached to products. The theme reads these plans and renders the UI. However, an app is still required to:

1. Create and manage selling plans on products
2. Store customer payment methods (PCI-compliant tokenization)
3. Generate recurring orders on schedule (4/6/8 weeks)
4. Handle failed payments / dunning

### Chosen approach: Custom Theme UI + Free App Backend

| Layer | Owner | Notes |
|---|---|---|
| Subscribe & Save UI widget | Us (theme Liquid/CSS/JS) | Fully branded, built from scratch |
| Selling plan data | App creates, theme reads | App attaches plans to products |
| Recurring billing | Free app | Seal Subscriptions or Appstle |

**App candidates (free tier):**
- **Seal Subscriptions** — free up to 150 active subscribers, clean API, good selling plan support
- **Appstle Subscriptions** — free up to $500/month subscription revenue, more features

### Theme implementation

1. Install chosen app → app creates selling plans on all products (4wk/6wk/8wk, 10% off)
2. In `sections/main-product.liquid`, add a new block type `subscription_selector`
3. Block renders the purchase-type radio UI using `product.selling_plan_groups` Liquid object
4. On subscribe selection, frequency dropdown appears; selected selling plan ID is injected into the product form
5. `product-form.js` updated to pass `selling_plan` param with the cart add request
6. CSS added to `assets/section-main-product.css` matching theme color schemes
7. Free shipping is applied via a Shopify shipping rate rule (not coded — configured in admin)

---

## Discount & Frequency Options

| Option | Interval | Discount |
|---|---|---|
| 4 weeks (Most Popular) | Every 4 weeks | 10% off |
| 6 weeks | Every 6 weeks | 10% off |
| 8 weeks | Every 8 weeks | 10% off |

Free shipping applied to all subscription orders via Shopify shipping rules.

---

## Out of Scope (for now)

- Customer subscription management portal (handled by app)
- Subscription-specific email flows
- Bundle/multi-product subscriptions
- Tiered discount based on frequency

---

## Decision Log

- **Custom first** — fully custom UI preferred; app used only for billing backend
- **Free tier only** — startup phase, no recurring app fees until subscriber count justifies upgrade
- **All products** — subscriptions enabled across the entire catalog
- **Skip if no free option** — if free tier turns out to be insufficient, feature is deferred

---

## Next Steps (when ready to implement)

1. Evaluate Seal Subscriptions vs Appstle free tiers — install one and verify selling plan creation works
2. Invoke `superpowers:writing-plans` skill to break into implementation tasks
3. Build UI block in `main-product.liquid`
4. Wire selling plan ID into product form submission
5. Style to match Roman Skin Care theme
6. Test on staging before pushing to live theme
