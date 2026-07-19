# PDP Section Release Workflow

## Release model

The production default PDP is the baseline. Improve one named section at a time in shared theme code so the result applies to all PDPs unless the user explicitly approves a product exception.

Existing `templates/product.<suffix>.json` enhanced templates are reference artifacts. Keep them unassigned and exclude them from a shared PDP release manifest. The shared template is `templates/product.json`.

Each release unit has:

- one section and acceptance criterion;
- one clean branch or worktree based on the production baseline;
- one manifest under `releases/pdp/`;
- one unpublished development-theme preview;
- one recorded approval;
- one scoped production push; and
- one automatic Git commit after the push succeeds.

Do not start the next section until the current release is either shipped and committed or explicitly abandoned.

## One-time baseline reconciliation

Before the first section release, compare the repository theme against the current live Shopify theme from a separate temporary directory or clean worktree. Do not pull live files over a dirty worktree. Preserve enhanced alternate templates for reference, but do not treat them as the production baseline.

Record the reconciled live state in Git before beginning iterative releases. Once the automatic release workflow is in use, every production change must have a corresponding scoped commit.

## Manifest contract

Create a JSON file such as `releases/pdp/2026-07-19-main-purchase-area.json`:

```json
{
  "id": "2026-07-19-main-purchase-area",
  "section": "Main product purchase area",
  "scope": "all-pdps",
  "commit_message": "feat(pdp): release main purchase area",
  "acceptance_criteria": [
    "The shared purchase area renders correctly on every PDP",
    "Add to Cart and affected variant states pass at desktop and mobile sizes"
  ],
  "development_approval": {
    "theme_id": "123456789",
    "preview_url": "https://roman-skin.myshopify.com/?preview_theme_id=123456789",
    "approved_by": "Name",
    "approved_at": "2026-07-19T18:00:00-04:00",
    "file_digest": "sha256-digest-printed-by-the-preview-command"
  },
  "theme_files": [
    "templates/product.json",
    "sections/main-product.liquid",
    "assets/section-main-product.css"
  ]
}
```

List exact files, not directories or globs. Include every runtime dependency changed for the section and nothing else. A shared release cannot include `templates/product.<suffix>.json`. Use `scope: "product-exception"` only with explicit approval and add a non-empty `exception_reason`.

The `development_approval` object can be added after preview testing. Copy the tested-file digest printed by the preview command. Production release is blocked until its theme ID, preview URL, approver, approval time, and exact tested digest are recorded. If any listed theme file changes after approval, production release fails and the section must be previewed and tested again.

## Iteration loop

1. Define the selected section, affected behavior, and evidence needs.
2. Make only that section's changes on a clean release branch or worktree.
3. Create the manifest and inspect `git diff -- <manifest files>` in full.
4. Run:

   ```bash
   npm run pdp:check -- --manifest releases/pdp/<release>.json
   ```

5. Push only the manifest files to an unpublished development theme:

   ```bash
   npm run pdp:preview -- --manifest releases/pdp/<release>.json --theme <development-theme-id>
   ```

6. Test the selected section at desktop, tablet, 390px, and 375px. Exercise affected variants, cart, app, analytics, keyboard, focus, and screen-reader behavior. Save the preview URL and approval.
7. After explicit production approval, run:

   ```bash
   npm run pdp:release -- --manifest releases/pdp/<release>.json --confirm-production
   ```

The release command reruns validation with production integration requirements, verifies that the approved development digest still matches, pushes only `theme_files` to the live theme, adds a timestamped `production_release` record to the manifest, stages only the manifest and its files, and creates the manifest's commit. Unrelated working-tree and staged changes are not included.

## Failure handling

- If development validation or testing fails, fix the same release unit and retest. Do not add another section.
- If the production push fails, no commit is created.
- If the production push succeeds but the Git commit fails, production has changed. Stop, do not begin another release, and run the recovery commit command printed by the script.
- If a listed file contains changes for more than one concern, split the file's diff before release. File-scoped automation cannot separate unrelated hunks inside one file.
- Never use `--allow-live` outside the explicit production release command.
