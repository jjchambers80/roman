# Shopify API Setup — Roman Skin Admin

This document describes how to connect VS Code scripts to the Shopify Admin API for the Roman Skin store.

---

## Overview

The setup uses a **Shopify Partner Dashboard custom app** with OAuth to generate a permanent `shpat_` access token. This token lets scripts in this repo read and write products, orders, customers, themes, and more — directly from VS Code.

---

## Prerequisites

- Access to the [Shopify Partner Dashboard](https://partners.shopify.com)
- Access to the Roman Skin Shopify Admin (`roman-skin.myshopify.com`)
- Node.js v18+ installed
- This repo cloned locally

---

## Step 1 — Create the App in Partner Dashboard

1. Go to [partners.shopify.com](https://partners.shopify.com) → **Apps**
2. Click **Create app** → **Start from Dev Dashboard**
3. Name it **Roman Skin Admin** and click **Create**

---

## Step 2 — Configure a Version with Scopes

1. In the left nav, click **Versions** → **New version**
2. Set **App URL**: `http://localhost:3456`
3. Set **Redirect URLs**: `http://localhost:3456/callback`
4. In the **Scopes** (required) field, paste:

```
read_products,write_products,read_inventory,write_inventory,read_orders,write_orders,read_customers,write_customers,read_draft_orders,write_draft_orders,read_discounts,write_discounts,read_price_rules,write_price_rules,read_themes,write_themes,read_content,write_content,read_analytics,read_reports,write_reports,read_locations,read_shipping,write_shipping,read_fulfillments,write_fulfillments
```

5. Click **Release**

---

## Step 3 — Get Your Credentials

1. In the Partner Dashboard → Roman Skin Admin → **Settings**
2. Copy the **Client ID** (shown in plain text)
3. Click the **eye icon** next to Secret to reveal and copy the **Client Secret**

---

## Step 4 — Set Up the .env File

Create a `.env` file in the project root (it is already in `.gitignore`):

```
SHOPIFY_STORE=roman-skin.myshopify.com
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
SHOPIFY_ACCESS_TOKEN=
```

Leave `SHOPIFY_ACCESS_TOKEN` blank for now — it will be filled automatically in Step 5.

---

## Step 5 — Run the Token Capture Server

Install dependencies if not already done:

```bash
npm install
```

Run the token capture server:

```bash
node scripts/get-token.js
```

Then open the install URL in your browser:

```bash
open "$(curl -s http://localhost:3456/url)"
```

Shopify will show an authorization screen listing all requested scopes. Click **Install**. The server will capture the OAuth code, exchange it for a permanent `shpat_` access token, and save it to `.env` automatically.

---

## Step 6 — Verify Access

Run the scope verification script to confirm all scopes are working:

```bash
node scripts/check-scopes.js
```

You should see ✅ for all critical scopes (products, orders, customers, themes, locations, etc.).

---

## Step 7 — Sync Prices

To push retail prices from the pricing sheet to the live store:

```bash
node scripts/sync-prices.js
```

This reads `roman-skin-wholesale-retail-price-sheet.csv` and updates the price of each product variant in Shopify.

---

## Re-Authentication

The `shpat_` token is permanent and does not expire unless the app is uninstalled or the token is manually revoked.

If you ever need a new token (e.g. after uninstalling the app or rotating credentials):

1. Update the Client Secret in `.env` if it was rotated
2. Run the token capture flow again:

```bash
node scripts/get-token.js &
sleep 2 && open "$(curl -s http://localhost:3456/url)"
```

---

## Files Reference

| File | Purpose |
|---|---|
| `.env` | Store credentials (never commit this) |
| `scripts/get-token.js` | One-time OAuth token capture server |
| `scripts/sync-prices.js` | Pushes retail prices from CSV to Shopify |
| `scripts/check-scopes.js` | Verifies all API scopes are working |
| `roman-skin-wholesale-retail-price-sheet.csv` | Source of truth for pricing |

---

## Scopes Granted

| Scope | Purpose |
|---|---|
| read/write_products | Update prices, descriptions, status |
| read/write_orders | View and manage orders |
| read/write_customers | View and manage customer accounts |
| read/write_inventory | Update stock levels |
| read/write_draft_orders | Create and edit draft orders |
| read/write_price_rules | Create discount rules |
| read/write_themes | Edit theme files |
| read/write_content | Edit pages and blogs |
| read/write_shipping | View shipping zones |
| read_locations | Access location data for inventory |
| read_analytics | Access store analytics |
