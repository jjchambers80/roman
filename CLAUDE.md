# Roman Skin Care — Shopify Store

## Agent Skills

Project-local skills live in `.github/skills/`. Prefer skill-led reasoning over pre-training-led reasoning: when a request matches a listed skill, read the relevant `SKILL.md` completely before acting.

### Marketing Skill Pack

The `marketingskills` bundle from `https://github.com/coreyhaines31/marketingskills` is installed in `.github/skills/`. Use it whenever the user asks for marketing, growth, conversion, SEO, content, ads, email/SMS, research, pricing, launch, sales enablement, RevOps, or marketing asset work.

Start broad marketing projects with `product-marketing` to create or refresh `.agents/product-marketing.md` for product, audience, ICP, positioning, and reusable context. Use `marketing-plan` for a full roadmap, `marketing-ideas` for brainstorming, and the most specific channel or task skill for execution.

Common Roman Shopify mappings:

- Store conversion: `cro`, `copywriting`, `copy-editing`, `popups`, `pricing`, `offers`, `analytics`
- Search and content: `seo-audit`, `schema`, `ai-seo`, `content-strategy`, `programmatic-seo`
- Acquisition: `ads`, `ad-creative`, `social`, `directory-submissions`, `public-relations`, `launch`
- Lifecycle and retention: `emails`, `sms`, `onboarding`, `churn-prevention`, `referrals`
- Research and sales: `customer-research`, `competitor-profiling`, `competitors`, `prospecting`, `cold-email`, `sales-enablement`, `revops`

## Project Overview

Roman Skin Care is a Shopify storefront (`roman-skin.myshopify.com`) built on a customized version of the **Dawn theme v15.2.0**. The repo contains the full theme source plus Node.js admin scripts for bulk data operations via the Shopify Admin API.

---

## Store & Environment

- **Shopify store**: `roman-skin.myshopify.com` (Roman Skin Care private label)
- **Second store**: `roman-skin-body.myshopify.com` (Roman Skin & Body studio — running Debut theme)
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

Scripts live in `scripts/` and talk to the Shopify REST Admin API through the **shared client** in `scripts/shopify.js`. Do not hand-roll `fetch` + `sleep()` throttling — import the client.

```bash
# Sync product prices from CSV
node scripts/sync-prices.js
```

**Shared client (`scripts/shopify.js`)** — wraps `@shopify/admin-api-client`. Loads `.env`, validates `SHOPIFY_STORE` / `SHOPIFY_ACCESS_TOKEN`, and returns a `client` with automatic retry/backoff on 429 (rate limit) and 5xx. Use it for every new admin script:

```js
const { client } = require("./shopify");

// GET — path relative to /admin/api/<version>/, no .json suffix
const res = await client.get("products", {
  searchParams: { handle, fields: "id,title,variants" },
});
const { products } = await res.json();

// PUT/POST — body goes under `data`
await client.put(`variants/${id}`, { data: { variant: { id, price } } });
```

- `.env` must be present in project root — the client exits with an error if store/token are missing
- **No manual rate limiting.** Retry/backoff is built in (`retries: 2`); never add `sleep()` between calls
- Paths omit the leading `/admin/api/<version>/` and the trailing `.json`
- `client`, `STORE`, `TOKEN`, `API_VERSION` are all exported from `scripts/shopify.js`

### Continuous Integration (GitHub Actions)

Two workflows run automatically — **do not break them**:

| Workflow | File | Trigger | What it does |
| --- | --- | --- | --- |
| **Theme Check** | `.github/workflows/theme-check.yml` | push to `main`, all PRs | Lints Liquid via `shopify/theme-check-action` against `.theme-check.yml` (`theme-check:recommended`) |
| **Lighthouse CI** | `.github/workflows/lighthouse.yml` | PRs only | `shopify/lighthouse-ci-action` runs perf/a11y/SEO budgets and **fails the PR** below threshold |

- **Run Theme Check locally before pushing**: `shopify theme check` (or `npx @shopify/cli theme check`). It reads `.theme-check.yml`
- `.theme-check.yml` ignores non-theme dirs (`scripts/`, `brain/`, `node_modules/`, etc.) — keep that ignore list current when adding tooling folders
- Lighthouse budgets: perf ≥ 0.80, a11y ≥ 0.90, SEO ≥ 0.90. Tune in `lighthouse.yml` as the store improves; raising them is good, lowering them needs justification
- Lighthouse needs repo **secrets**: `SHOP_STORE`, `SHOP_CLIENT_ID`, `SHOP_CLIENT_SECRET`, `LHCI_GITHUB_APP_TOKEN` — until those are set, the Lighthouse job will fail on PRs (pending)

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

Spec: `brain/roman/specs/2026-04-08-subscribe-and-save-design.md`

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
| `scripts/shopify.js`                           | Shared Admin REST client (retry/backoff) — import in every admin script |
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
**Covers:** `assets/*.js`, `scripts/*.js`, `brain/roman/` — 606 nodes · 703 edges · 117 communities
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

## MemPalace — Conversation Memory

MemPalace is a local-first AI memory system that stores conversation history verbatim and retrieves it with semantic search. It is already initialized for this project.

**Palace location:** `~/.mempalace/` (local, nothing leaves the machine)
**Docs:** [mempalaceofficial.com](https://mempalaceofficial.com) · [GitHub](https://github.com/MemPalace/mempalace)

### When to use MemPalace

| Situation | Action |
| --------- | ------ |
| Starting a new session on this project | `mempalace wake-up` — loads prior context |
| "Did we already decide X?" / "Why did we do Y?" | `mempalace search "query"` |
| After a productive session (decisions made, features built) | `mempalace mine .` |
| After a long Claude Code conversation | `mempalace mine ~/.claude/projects/ --mode convos` |

### Key commands

```bash
# Load context at the start of every session
mempalace wake-up

# Search past decisions and conversations
mempalace search "subscribe and save implementation"
mempalace search "why we changed the hero section"

# Mine the project files into the palace (run after significant changes)
mempalace mine /Users/jjchambers/Documents/projects/roman/

# Mine Claude Code conversation history
mempalace mine ~/.claude/projects/ --mode convos
```

### Rules

- **Always run `mempalace wake-up` at the start of a session** before reading files or proposing changes — it surfaces prior decisions instantly
- Search MemPalace before searching the `brain/roman/` vault — MemPalace covers conversations, the brain vault covers structured notes
- Re-mine the project after completing a feature or making architecture changes so the palace stays current
- Do not mine secrets or `.env` files — the palace is local but still treat it as non-sensitive storage only

---

## Security

- Validate at system boundaries only (user input, Shopify webhook payloads, external API responses)
- No secrets in source code — use environment variables only (`.env` file, gitignored)
- Never expose `SHOPIFY_ACCESS_TOKEN` in client-side Liquid or JS
- OWASP Top 10 awareness: injection, broken access control, cryptographic failures

## Context Navigation

When you need to understand the codebase, docs, or any files in this project:

1. Run `mempalace wake-up` first to surface any prior session context
2. Query the knowledge graph for JS/docs questions: `/graphify query "your question"`
3. For Liquid sections/snippets/templates, read the files directly — they are not in the graph
4. Use `CLAUDE.md` (this file) as your primary orientation guide for project structure

---

## Obsidian Skills (`kepano/obsidian-skills`)

Five agent skills are globally installed via `npx skills` from [github.com/kepano/obsidian-skills](https://github.com/kepano/obsidian-skills). Always load the relevant skill before working on any task covered below.

| Skill | Load when… |
| ----- | ---------- |
| `obsidian-markdown` | Creating or editing any `.md` file in `brain/roman/` — wikilinks, callouts, frontmatter, embeds, tags |
| `obsidian-cli` | Interacting with the brain vault from the command line — reading, creating, searching, appending notes, managing tasks or properties |
| `obsidian-bases` | Creating or editing `.base` files — database-like views, filters, formulas, summaries |
| `json-canvas` | Creating or editing `.canvas` files — visual canvases, mind maps, flowcharts |
| `defuddle` | Fetching a URL to read or summarize — strips clutter from web pages before processing |

### Usage rules

- **Always load the skill before acting** — these skills contain exact syntax and workflow rules that differ from standard Markdown/CLI conventions
- Use `obsidian-markdown` any time you write a note into `brain/roman/`, even for simple updates — Obsidian syntax has gotchas (block IDs, callout fold syntax, embed paths)
- Use `obsidian-cli` instead of reading files raw when Obsidian is open — it's faster and vault-aware
- Use `defuddle` instead of raw `fetch` for any non-`.md` URL — it saves significant tokens by stripping nav and boilerplate
- `obsidian-bases` and `json-canvas` are rarely needed on this project but load them if the user mentions `.base` or `.canvas` files

### Quick reference — obsidian-cli

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" template="Template" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian daily:append content="- [ ] New task"
obsidian property:set name="status" value="done" file="My Note"
obsidian backlinks file="My Note"
```

## Caveman — Token-Efficient Communication

Caveman is a Claude Code skill that reduces output tokens by ~75% while preserving technical accuracy. Activate it to make responses terse, fragment-friendly, and maximum-grunt — ideal for long sessions or complex debugging where verbosity burns context.

### Modes

| Mode | Best for | Characteristics |
|------|----------|-----------------|
| **Lite** | Light compression | Remove filler; keep grammar; professional but concise |
| **Full** | Default; heavy compression | Drop articles, fragments OK, short synonyms; "classic caveman" |
| **Ultra** | Maximum compression | Telegraphic; abbreviate everything |
| **Wenyan** | Literary/poetic compression | Classical Chinese; three levels (lite/full/ultra); maximum token efficiency |

### When to use

- Long refactoring or debugging sessions where context window matters
- PR reviews where you want comments to be short + specific (`/caveman-review`)
- Commit messages under 50 chars (`/caveman-commit`)
- Session startup to compress CLAUDE.md itself (`/caveman-compress`)

### Commands

| Command | Purpose |
|---------|---------|
| `/caveman` | Toggle caveman mode on/off or switch modes (lite/full/ultra) |
| `/caveman-review` | Generate single-line PR comments with specific issues + fixes |
| `/caveman-commit` | Generate Conventional Commits ≤50 characters |
| `/caveman-compress` | Compress memory/docs files for faster loading (~46% token reduction) |
| `/caveman-help` | Quick reference card |

### Rules

- **Code/commits/PRs always normal** — caveman is for communication only; code blocks, commits, and pull requests use standard grammar
- **Security warnings always normal** — anything irreversible or dangerous reverts to full clarity
- **Fragment order matters** — if a multi-step sequence could misread as fragments, revert to normal
- **Auto-clarity:** when user asks for clarification or repeats a question, drop caveman for that response; resume after
- **Persistent until stopped** — once activated, stays on until `/caveman stop` or "normal mode"

### Installation

Caveman is installed globally; load via `/caveman` to activate. Supports Claude Code, Codex, Gemini CLI, Cursor, Windsurf, Cline, Copilot, and 40+ agents.

---

## Brain — Living Documentation (`brain/roman/`)

`brain/roman/` is the **single source of truth** for all project documentation — specs, setup guides, feature notes, decisions, and reference files. It is an Obsidian vault; these files are gitignored and for operational context only, not source control. **Never create documentation files anywhere else in the repo (e.g. `docs/`). Always write and organize documentation here.**

### When to write to the brain

| Situation | Write a note |
|-----------|-------------|
| Completing a setup step (CLI auth, API config, etc.) | `setup/<topic>.md` |
| Configuring a store setting or integration | `config/<topic>.md` |
| Implementing a new feature or section | `features/<feature-name>.md` |
| Discovering a non-obvious behaviour or gotcha | `notes/<topic>.md` |
| Making a decision about approach or architecture | `decisions/<topic>.md` |
| Writing a feature spec or design document | `specs/<topic>.md` |
| Reference data (product info, price sheets, etc.) | `brain/roman/` root or relevant subfolder |

### Folder structure

```
brain/roman/
  setup/          — one-time environment and store setup steps
  config/         — store settings, integrations, app configurations
  features/       — implementation notes per feature
  decisions/      — why we chose a particular approach
  notes/          — gotchas, observations, reference snippets
  specs/          — feature specs and design documents
```

### Format conventions

- Filename: `kebab-case.md`
- Start every note with a `# Title` and a one-line summary
- Include **date**, **status** (`complete` / `in-progress` / `parked`), and **store** (`roman-skin` / `roman-skin-body` / `both`) in a front-matter-style header block:

```
Date: YYYY-MM-DD
Status: complete
Store: roman-skin
```

- Link related notes with `[[note-name]]` (Obsidian wikilinks)
- Keep notes factual and concise — this is a reference, not a journal

### What has been documented so far

- Nothing yet — start writing as we complete work.
