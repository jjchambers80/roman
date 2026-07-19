---
name: roman-pdp-rollout
description: Iteratively improve, test, and release Roman Skin product-detail page sections from verified product evidence. Use when changing the shared PDP, preserving enhanced alternate templates as references, writing product-specific PDP copy or FAQs, configuring PDP galleries or purchase controls, or validating and releasing one PDP section through development and production.
---

# Roman PDP Rollout

Improve the live shared PDP one section at a time while keeping every product statement traceable to an approved source and every production release isolated in Git.

## Required references

Read both references completely before drafting copy or editing a PDP:

- `references/evidence-policy.md`
- `references/layout-contract.md`
- `references/release-workflow.md`

For gallery creation or modification, also invoke `roman-pdp-image-system` and follow its image specification. Do not duplicate or weaken its packaging-fidelity rules.

## Workflow

1. Resolve the repository root, current live PDP baseline, one named section release unit, target development theme, and intended preview URL. Confirm the target theme is not live.
2. Inspect the worktree and preserve all existing changes. Start implementation from a clean branch or worktree based on the production baseline; do not fold an existing mixed worktree into a release.
3. Read the shared default product template, the selected section and its dependencies, integration checks, relevant product metafields, product context, and approved marketing context.
4. Treat existing enhanced alternate product templates as unassigned reference material. Do not extend or assign them unless the user explicitly requests a product exception.
5. When the section introduces or changes customer-facing claims, build or update the claim-evidence ledger using `references/evidence-policy.md`. Stop on missing, stale, or contradictory evidence.
6. Implement only the selected section in shared theme code so it applies to every PDP. Keep product-specific content dynamic through product data, metafields, blocks, or an explicitly approved exception.
7. Use `references/layout-contract.md` as the target-state and behavior reference for the selected section. Do not implement the rest of the target layout in the same release.
8. Create one release manifest under `releases/pdp/` listing every theme file required by the section. Review the complete diff of those files for unrelated edits.
9. Run `node scripts/pdp-section-release.js check --manifest <path>`, then push only the manifest's theme files to a confirmed unpublished development theme with the preview command. Never use `--allow-live` during development.
10. Test the selected section on desktop, tablet, 390px, and 375px, plus every affected commerce and accessibility behavior in the layout contract. Record approval before production.
11. Release only after development approval with `node scripts/pdp-section-release.js release --manifest <path> --confirm-production`. The command must validate, push only the listed theme files to live, and then commit only the manifest and listed files.
12. Report the release unit, exact files, evidence gaps, validation results, development preview URL, production result, and resulting commit SHA.

## Hard stops

- Do not publish copy whose product, ingredient, efficacy, safety, compatibility, certification, testimonial, shipping, guarantee, price, size, or usage evidence is missing or contradictory.
- Do not treat existing live copy as approved merely because it is live.
- Do not convert testimonials into ratings or Judge.me reviews.
- Do not expose sample, test, seeded, or unverified reviews in markup, schema, ads, or decisions.
- Do not hard-code variant price, availability, Shop Pay installment amounts, currency, or inventory state.
- Do not generate or alter Roman product packaging with AI.
- Do not make a production write during development rollout.
- Do not combine multiple PDP sections or unrelated repository changes in one release manifest or production commit.
- Do not use a product-specific alternate template for a change intended to reach every PDP.
- Do not release without an approved development-theme test pass.
- Do not manually broaden the automatic release commit after the production push.

## Completion standard

Complete a section rollout only when the selected shared section is approved on an unpublished development theme, its copy has traceable evidence with no unresolved contradictions, affected responsive and commerce behavior works, automated checks pass apart from documented pre-existing warnings, production contains only the approved file set, and the automatic scoped commit succeeds.
