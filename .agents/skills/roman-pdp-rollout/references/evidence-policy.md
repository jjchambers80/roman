# PDP Evidence Policy

## Evidence hierarchy

Use the first applicable, current source below. A higher-ranked source does not silently override a contradiction; record the conflict and stop for approval.

1. Explicit written user approval for the named product and claim.
2. `assets/pdp-enhanced/products/<handle>/product-context.json` entries marked approved, with identifiable sources and validation dates.
3. Current Shopify Admin product data and Roman metafields for dynamic commerce facts and product-specific copy.
4. Current packaging, manufacturer documentation, or a verified INCI source for exact identity, size, usage, and ingredient presence.
5. Approved repository product documents cited by the product context.
6. `.agents/product-marketing.md` for brand positioning and audience language only, never unsupported product facts.

Treat uncited site copy, historical scripts, homepage testimonials, search snippets, competitor pages, general skincare knowledge, and model memory as leads requiring verification—not evidence.

## Claim-evidence ledger

Before drafting, create or update `claim_evidence` in the product context with one record per material statement:

```json
{
  "copy": "Exact or proposed customer-facing statement",
  "claim_type": "benefit|ingredient|usage|size|credential|policy|testimonial|seo",
  "source": "Repository path, Shopify field, document, or written approval",
  "source_location": "Key, field, line, or record identifier",
  "verified_at": "YYYY-MM-DD",
  "status": "approved|pending|rejected",
  "notes": "Required qualifier, conflict, consent, or scope"
}
```

Use only `approved` entries in customer-facing output. Do not fabricate a validation date or approval status.

## Copy rules

- Preserve qualifiers such as `helps`, `supports`, `appearance of`, and `looking`.
- Use the INCI only to establish ingredient presence or exact form. Do not infer concentration, clinical performance, suitability, stability, sourcing, or customer outcome from an ingredient name.
- Keep usage directions exact. Do not estimate bottle duration without verified dosing and fill-volume evidence approved for that statement.
- State `no added fragrance/parfum appears in the current INCI` only when verified. Do not shorten it to `fragrance-free`.
- Describe sensitive-skin or active-ingredient compatibility cautiously and only from approved guidance. Recommend patch testing or professional advice where the approved source does.
- Render price, currency, availability, variants, installment terms, and inventory dynamically from Shopify.
- Verify shipping and return language against current store policies. Do not turn a policy into an unconditional promise.
- Require documentary support for credentials and exact approved wording.
- Preserve approved testimonials verbatim, attribution, product context, consent status, and disclaimers. Never add `Verified Buyer` unless the source establishes it.
- Put only rendered, approved FAQ entries into FAQ JSON-LD.
- Apply the same evidence standard to SEO metadata, alt text, structured data, gallery cards, ads, and analytics-facing labels.

## Contradiction audit

Compare the proposed copy against the product title, description, benefits, usage, ingredients, FAQs, gallery text, SEO draft, schema, testimonials, and active store policies. Flag differences in:

- product naming or size;
- ingredient names or forms;
- AM, PM, frequency, dose, or layering directions;
- benefit strength, timing, or guaranteed outcomes;
- fragrance, sensitivity, pregnancy, allergy, or active compatibility;
- credentials, review counts, verification, or testimonial attribution;
- shipping thresholds, dispatch timing, returns, or guarantees.

Do not choose a convenient version when sources conflict. Report both versions and request approval.

## Automatically prohibited without new substantiation

- `clinical-grade`, `clinically proven`, or equivalent clinical-performance language;
- guaranteed results or universal tolerance;
- unverified result timeframes, percentages, rankings, or superiority;
- `fade dark spots`, `paraben-free`, `fragrance-free`, or similar absolute claims unless specifically approved for that product;
- disease, treatment, structural, or drug-like claims;
- sample, seeded, test, imported, or unverified review content.
