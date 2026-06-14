<!-- skill-ninja-START -->
## Agent Skills

> **IMPORTANT**: Prefer skill-led reasoning over pre-training-led reasoning.
> Read the relevant SKILL.md before working on tasks covered by these skills.

### Skills

| Skill | Description |
|-------|-------------|
| [frontend-design](.github/skills/frontend-design/SKILL.md) | Create distinctive, production-grade frontend interfaces with high design quality. |
| [lead-research-assistant](.github/skills/lead-research-assistant/SKILL.md) | Identifies high-quality leads for your product or service by analyzing your business, searching f... \| This skill helps you identify and qualify potential leads for your business by analyzing your pro... |
| [obsidian-cli](.github/skills/obsidian-cli/SKILL.md) | Interact with Obsidian vaults using the Obsidian CLI — read, create, search, and manage notes, tasks, properties, and more. Use when asked to interact with the brain vault or perform vault operations from the command line. |
| [obsidian-markdown](.github/skills/obsidian-markdown/SKILL.md) | Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax. Use when working with .md files in Obsidian, or when the user mentions wikilinks, callouts, frontmatter, tags, embeds, or Obsidian notes. |

<!-- skill-ninja-END -->

# Roman Skin Care — Shopify Store

## Project Overview

Roman Skin Care is a Shopify storefront (`roman-skin.myshopify.com`) built on a customized version of the **Dawn theme v15.2.0**. The repo contains the full theme source plus Node.js admin scripts for bulk data operations via the Shopify Admin API.

## Store & Environment

- **Shopify store**: `roman-skin.myshopify.com` (Roman Skin Care private label)
- **Second store**: `roman-skin-body.myshopify.com` (Roman Skin & Body studio — running Debut theme)
- **Admin API version**: `2026-04`
- **Theme base**: Dawn v15.2.0 (Shopify official)
- **Credentials**: stored in `.env` (gitignored) — never hardcode tokens

```bash
SHOPIFY_STORE=roman-skin.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
```

## Theme Architecture

Standard Shopify Online Store 2.0 structure:

| Folder | Purpose |
| --- | --- |
| `assets/` | CSS, JS, images — referenced via `asset_url` filter |
| `config/` | `settings_schema.json` (theme editor fields), `settings_data.json` (saved values) |
| `layout/` | `theme.liquid` (global shell), `password.liquid` |
| `locales/` | Translation strings (`en.default.json`, etc.) |
| `sections/` | Section Liquid files — reusable page building blocks |
| `snippets/` | Reusable Liquid partials (rendered with `render` tag) |
| `templates/` | JSON templates that wire sections to page types |

### Custom Sections

These sections were built from scratch and are not part of base Dawn:

- `announcement-bar.liquid` — top-of-page promotional banner
- `brands-landing.liquid` — brand partner grid
- `hero-split.liquid` — two-column hero with image + copy
- `ingredient-icons.liquid` — icon row for key ingredients
- `landing-evening-defense.liquid` / `landing-morning-defense.liquid` — routine landing pages
- `roman-faq-accordion.liquid` — FAQ with accordion expand/collapse
- `roman-routines-landing.liquid` — routines overview landing
- `roman-tos.liquid` — Terms of Service page section
- `skin-concerns.liquid` — skin concern selector/visual
- `testimonials.liquid` — customer testimonials carousel/grid
- `trust-strip.liquid` — trust badges / USP strip

### Custom Templates

- `page.brands.json`
- `page.morning-defense.json` / `page.evening-defense.json`
- `page.routines.json`
- `page.faq.json`
- `page.tos.json`

## Development Workflow

### Theme Development

```bash
shopify theme dev
shopify theme push --theme <theme-id>
shopify theme pull
```

### Admin API Scripts

Scripts live in `scripts/` and talk to the Shopify REST Admin API through the **shared client** in `scripts/shopify.js`. Do not hand-roll `fetch` + `sleep()` throttling — import the client.

```bash
node scripts/sync-prices.js
```

**Shared client (`scripts/shopify.js`)** wraps `@shopify/admin-api-client`. It loads `.env`, validates `SHOPIFY_STORE` / `SHOPIFY_ACCESS_TOKEN`, and returns a `client` with automatic retry/backoff on 429 and 5xx. Use it for every new admin script:

```js
const { client } = require("./shopify");

// path is relative to /admin/api/<version>/ and omits the .json suffix
const res = await client.get("products", {
  searchParams: { handle, fields: "id,title,variants" },
});
const { products } = await res.json();

await client.put(`variants/${id}`, { data: { variant: { id, price } } });
```

- `.env` must be present in project root — the client exits if store/token are missing
- **No manual rate limiting** — retry/backoff is built in (`retries: 2`); never add `sleep()` between calls
- `client`, `STORE`, `TOKEN`, `API_VERSION` are exported from `scripts/shopify.js`

### Continuous Integration (GitHub Actions)

Two workflows run automatically — do not break them:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **Theme Check** | `.github/workflows/theme-check.yml` | push to `main`, all PRs | Lints Liquid via `shopify/theme-check-action` against `.theme-check.yml` (`theme-check:recommended`) |
| **Lighthouse CI** | `.github/workflows/lighthouse.yml` | PRs only | `shopify/lighthouse-ci-action` runs perf/a11y/SEO budgets and fails the PR below threshold |

- Run Theme Check locally before pushing: `shopify theme check` (reads `.theme-check.yml`)
- `.theme-check.yml` ignores non-theme dirs (`scripts/`, `brain/`, `node_modules/`, …) — keep that list current when adding tooling folders
- Lighthouse budgets: perf ≥ 0.80, a11y ≥ 0.90, SEO ≥ 0.90. Tune in `lighthouse.yml`; lowering a budget needs justification
- Lighthouse needs repo secrets `SHOP_STORE`, `SHOP_CLIENT_ID`, `SHOP_CLIENT_SECRET`, `LHCI_GITHUB_APP_TOKEN` — until set, the Lighthouse job fails on PRs (pending)

## Coding Conventions

### Liquid

- Use `render` (not `include`) for snippets
- Section settings are accessed via `section.settings.<id>`
- Block settings via `block.settings.<id>`
- Use `| asset_url | stylesheet_tag` / `script_tag` for asset loading
- Translations use `t:` prefix keys referencing `locales/en.default.json`
- CSS scoped to sections uses `section-{{ section.id }}-padding` pattern

### CSS

- Component-scoped stylesheets: `component-<name>.css`
- Section-scoped stylesheets: `section-<name>.css`
- Load via `asset_url` in the section's Liquid file, not globally
- Base theme variables defined in `assets/base.css`

### JavaScript

- Custom elements (Web Components) pattern — see `assets/product-info.js`, `assets/cart-drawer.js`
- Event bus via `assets/pubsub.js` — use `publish`/`subscribe` for cross-component communication
- No build step — plain ES modules loaded directly

### Metafields

- Product metafields defined in `.shopify/metafields.json`
- Key namespace: `shopify` for Shopify-native fields; use `custom` namespace for Roman-specific metafields

## In-Progress Features

### Subscribe & Save

Parked and not in active development.

Spec: `brain/roman/specs/2026-04-08-subscribe-and-save-design.md`

- Hybrid approach: custom theme UI + free subscription app backend (Seal Subscriptions or Appstle)
- Theme reads `product.selling_plan_groups` Liquid object
- New block type `subscription_selector` to be added to `sections/main-product.liquid`
- Do not implement without reviewing the spec first

## Key Files To Know

| File | What it does |
| --- | --- |
| `sections/main-product.liquid` | Product detail page — most complex section |
| `sections/main-collection-product-grid.liquid` | Collection page grid |
| `snippets/card-product.liquid` | Product card used across collection/search/related |
| `snippets/price.liquid` | Price display (handles compare-at, sale badges) |
| `assets/product-form.js` | Add-to-cart logic, variant selection, selling plan handling |
| `assets/cart-drawer.js` | Slide-out cart drawer |
| `assets/pubsub.js` | Pub/sub event system |
| `scripts/shopify.js` | Shared Admin REST client (retry/backoff) — import in every admin script |
| `scripts/sync-prices.js` | Bulk price sync from `roman-skin-wholesale-retail-price-sheet.csv` |
| `config/settings_schema.json` | Theme editor — add new global settings here |

## Security Notes

- Never commit `.env` or any `shpat_` token
- `.env` is in `.gitignore` — verify before any git operation
- Admin API token has broad write scopes — scripts should be idempotent and confirm before destructive operations

## Caveman Plugin

Use Caveman when terse agent output is preferred over conversational output.

- Install in Codex with `/plugins`, search for `Caveman`, then install the `JuliusBrussee/caveman` plugin
- Start Caveman manually in Codex with `$caveman`
- Codex supports Caveman intensity switching; use `$caveman` to select `lite`, `full`, or `ultra`
- `caveman-compress` and `caveman-help` are available through the plugin workflow
- `caveman-commit` and `caveman-review` are not part of the Codex plugin bundle; use the upstream SKILL files directly if those workflows are needed

### Roman Repo Notes

- This repo does not currently ship Caveman auto-start files such as `.codex/hooks.json` or `.codex/config.toml`
- In this repo, assume Caveman is opt-in and must be started manually with `$caveman`
- If always-on Caveman behavior is desired later, copy Caveman's `SessionStart` hook into `.codex/hooks.json` and enable Codex hooks in `.codex/config.toml` with:

```toml
[features]
codex_hooks = true
```

Source: Caveman README for Codex usage and hook behavior:
https://github.com/JuliusBrussee/caveman/blob/main/README.md

## Agent Orchestration

Use delegation when the platform supports subagents and the task benefits from parallel work. Keep the main thread focused on integration and decisions; hand off bounded, well-scoped tasks instead of outsourcing the whole job.

| Task Type | Preferred Agent Role | Model Class |
| --- | --- | --- |
| File scanning, "what handles X?", summarization | `explorer` | Fast / low-cost |
| Code review, diff analysis, convention checks | `reviewer` | Fast / low-cost |
| Feature implementation, bug fixes, refactoring, tests | `implementer` | Balanced |
| Architecture (3+ modules), ADRs, API design | `architect` | Deep-reasoning |

### Rules

- Delegate exploration first when the codebase area is unclear; avoid loading broad context into the main thread unnecessarily
- Use review-focused agents for diff review and convention checks when available
- Reserve architecture/deep-reasoning agents for cross-cutting design work and escalation cases
- Run independent agent tasks in parallel when possible
- Pass summaries, constraints, and file paths when delegating; avoid dumping large raw file contents unless necessary
- If subagents are not available, follow the same role split mentally: explore first, implement second, review before handoff

## Agent Rules

1. **Read before writing** — always read existing code before proposing changes. Understand the patterns in use.
2. **Minimal diffs** — change only what's needed. Don't refactor adjacent code, add comments to unchanged code, or "improve" surrounding logic.
3. **No speculative error handling** — trust framework guarantees for internal code. Only validate at system boundaries (user input, external API responses).
4. **Plan before implementing** — for changes spanning 3+ files, emit a plan first, then implement.
5. **Summarize before handoff** — when switching between tasks or tiers, summarize: what was tried, what was found, current state. Don't carry full file contents between unrelated tasks.
6. **One task per session** — keep context narrow. Start a new session for unrelated work.

## Escalation Rules

Work starts at the cheapest tier and escalates only with justification.

### Fast Tier

Haiku (`cc-fast`)

Use for:

- Summarizing files or modules
- Scanning repo structure ("what files handle X?")
- Reviewing small diffs (<100 lines changed)
- Generating boilerplate from established patterns

### Mid Tier

Sonnet (`cc`) — default

Use for:

- Feature implementation
- Bug debugging
- Code refactoring
- Test writing
- Most day-to-day coding work

### Deep Tier

Opus (`cc-arch`)

Escalate only when:

- Designing architecture spanning 3+ modules
- Debugging persists after 2 failed Sonnet attempts
- Writing or reviewing ADRs / technical specifications
- Designing new API contracts or data models
