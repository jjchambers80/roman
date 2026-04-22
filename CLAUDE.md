# Roman Skin Care — Shopify Store

## Project Overview

Roman Skin Care is a Shopify storefront (`roman-skin.myshopify.com`) built on a customized version of the **Dawn theme v15.2.0**. The repo contains the full theme source plus Node.js admin scripts for bulk data operations via the Shopify Admin API.

---

## Store & Environment

- **Shopify store**: `roman-skin.myshopify.com`
- **Admin API version**: `2026-04`
- **Theme base**: Dawn v15.2.0 (Shopify official)
- **Credentials**: stored in `.env` (gitignored) — never hardcode tokens

```
SHOPIFY_STORE=roman-skin.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
```

---

## Theme Architecture

Standard Shopify Online Store 2.0 structure:

| Folder       | Purpose                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| `assets/`    | CSS, JS, images — referenced via `asset_url` filter                               |
| `config/`    | `settings_schema.json` (theme editor fields), `settings_data.json` (saved values) |
| `layout/`    | `theme.liquid` (global shell), `password.liquid`                                  |
| `locales/`   | Translation strings (en.default.json, etc.)                                       |
| `sections/`  | Section Liquid files — reusable page building blocks                              |
| `snippets/`  | Reusable Liquid partials (rendered with `render` tag)                             |
| `templates/` | JSON templates that wire sections to page types                                   |

### Custom sections (Roman-specific)

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

### Custom templates

- `page.brands.json`
- `page.morning-defense.json` / `page.evening-defense.json`
- `page.routines.json`
- `page.faq.json`
- `page.tos.json`

---

## Development Workflow

### Theme development (Shopify CLI)

```bash
# Push theme changes to the store (development theme)
shopify theme dev

# Push to a specific theme
shopify theme push --theme <theme-id>

# Pull latest from store
shopify theme pull
```

### Admin API scripts (Node.js)

Scripts live in `scripts/` and use the Shopify REST Admin API:

```bash
# Sync product prices from CSV
node scripts/sync-prices.js
```

- All scripts use `dotenv` — `.env` must be present in project root
- API rate limit: 2 req/sec on standard plan — scripts use `sleep()` between calls
- API base URL pattern: `https://${STORE}/admin/api/${API_VERSION}/`

---

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

---

## In-Progress Features

### Subscribe & Save (parked — not in active development)

Spec: `docs/superpowers/specs/2026-04-08-subscribe-and-save-design.md`

- Hybrid approach: custom theme UI + free subscription app backend (Seal Subscriptions or Appstle)
- Theme reads `product.selling_plan_groups` Liquid object
- New block type `subscription_selector` to be added to `sections/main-product.liquid`
- Do not implement without reviewing the spec first

---

## Key Files to Know

| File                                           | What it does                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `sections/main-product.liquid`                 | Product detail page — most complex section                         |
| `sections/main-collection-product-grid.liquid` | Collection page grid                                               |
| `snippets/card-product.liquid`                 | Product card used across collection/search/related                 |
| `snippets/price.liquid`                        | Price display (handles compare-at, sale badges)                    |
| `assets/product-form.js`                       | Add-to-cart logic, variant selection, selling plan handling        |
| `assets/cart-drawer.js`                        | Slide-out cart drawer                                              |
| `assets/pubsub.js`                             | Pub/sub event system                                               |
| `scripts/sync-prices.js`                       | Bulk price sync from `roman-skin-wholesale-retail-price-sheet.csv` |
| `config/settings_schema.json`                  | Theme editor — add new global settings here                        |

---

## Security Notes

- Never commit `.env` or any `shpat_` token
- `.env` is in `.gitignore` — verify before any git operation
- Admin API token has broad write scopes — scripts should be idempotent and confirm before destructive operations

## Agent Orchestration

Delegate work to subagents defined in `.claude/agents/` to optimize cost and speed. Do not do everything at your own tier.

| Task Type                                             | Delegate To   | Model  |
| ----------------------------------------------------- | ------------- | ------ |
| File scanning, "what handles X?", summarization       | `explorer`    | Haiku  |
| Code review, diff analysis, convention checks         | `reviewer`    | Haiku  |
| Feature implementation, bug fixes, refactoring, tests | `implementer` | Sonnet |
| Architecture (3+ modules), ADRs, API design           | `architect`   | Opus   |

**Rules:**

- Always delegate scanning/exploration to `explorer` before implementing — don't read dozens of files at a high-cost tier
- Delegate code review to `reviewer` — don't review diffs at Opus/Sonnet cost
- Only invoke `architect` when escalation criteria are met (see Escalation Rules)
- Run independent subagents in parallel when possible
- When delegating to `architect`, pass a summary of findings — not raw file contents

## Agent Rules

1. **Read before writing** — always read existing code before proposing changes. Understand the patterns in use.
2. **Minimal diffs** — change only what's needed. Don't refactor adjacent code, add comments to unchanged code, or "improve" surrounding logic.
3. **No speculative error handling** — trust framework guarantees for internal code. Only validate at system boundaries (user input, external API responses).
4. **Plan before implementing** — for changes spanning 3+ files, emit a plan first, then implement.
5. **Summarize before handoff** — when switching between tasks or tiers, summarize: what was tried, what was found, current state. Don't carry full file contents between unrelated tasks.
6. **One task per session** — keep context narrow. Start a new session for unrelated work.

## Escalation Rules

Work starts at the cheapest tier and escalates only with justification.

### Fast Tier (Haiku — `cc-fast`)

Use for:

- Summarizing files or modules
- Scanning repo structure ("what files handle X?")
- Reviewing small diffs (<100 lines changed)
- Generating boilerplate from established patterns

### Mid Tier (Sonnet — `cc` — DEFAULT)

Use for:

- Feature implementation
- Bug debugging
- Code refactoring
- Test writing
- Most day-to-day coding work

### Deep Tier (Opus — `cc-arch`)

Escalate ONLY when:

- Designing architecture spanning 3+ modules
- Debugging persists after 2 failed Sonnet attempts
- Writing or reviewing ADRs / technical specifications
- Designing new API contracts or data models
- Multi-step reasoning across backend + frontend + database

**Protocol for Opus:** receive a SUMMARY (not raw files), produce a PLAN or DECISION, hand the plan back DOWN to Sonnet for implementation.

## Graphify — Knowledge Graph

A persistent knowledge graph of this Shopify theme lives in `graphify-out/`. Use it to answer structural questions cheaply instead of reading dozens of files.

**Graph location:** `graphify-out/graph.json` · `graphify-out/graph.html` (open in browser)
**Covers:** `assets/*.js`, `scripts/*.js`, `docs/` — 606 nodes · 703 edges · 117 communities
**God nodes** (most connected): `PredictiveSearch`, `FacetFiltersForm`, `SlideshowComponent`, `CartItems`, `CartDrawer`

### When to use the graph

| Situation                                | Action                               |
| ---------------------------------------- | ------------------------------------ |
| "What calls X?" / "What imports Y?"      | `/graphify query "X"`                |
| "How does A connect to B?"               | `/graphify path "A" "B"`             |
| "What does this module do?"              | `/graphify explain "module-name"`    |
| Starting work on an unfamiliar JS module | Query the graph before reading files |
| After adding or changing JS/docs files   | `/graphify . --update`               |

### When NOT to use the graph

- Liquid files (sections, snippets, templates) are not indexed — read those directly
- The graph is stale for new files added since the last build — run `--update` first

### Building / updating the graph

```bash
/graphify .
```

### Querying the graph directly

```python
$(cat graphify-out/.graphify_python) -c "
import json, networkx as nx
from networkx.readwrite import json_graph
from pathlib import Path
G = json_graph.node_link_graph(json.loads(Path('graphify-out/graph.json').read_text()), edges='links')
# ... query G here
"
```

## Security

- Validate at system boundaries only (user input, Shopify webhook payloads, external API responses)
- No secrets in source code — use environment variables only (`.env` file, gitignored)
- Never expose `SHOPIFY_ACCESS_TOKEN` in client-side Liquid or JS
- OWASP Top 10 awareness: injection, broken access control, cryptographic failures

## Context Navigation

When you need to understand the codebase, docs, or any files in this project:

1. Query the knowledge graph first for JS/docs questions: `/graphify query "your question"`
2. For Liquid sections/snippets/templates, read the files directly — they are not in the graph
3. Use `CLAUDE.md` (this file) as your primary orientation guide for project structure
