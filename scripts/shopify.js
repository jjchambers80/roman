// Shared Shopify Admin REST client for all admin scripts.
//
// Wraps @shopify/admin-api-client which provides automatic retry/backoff on
// 429 (rate limit) and 5xx responses — replacing the hand-rolled sleep()
// throttle each script used to carry.
//
// Usage:
//   const { client } = require("./shopify");
//   const res = await client.get("products", {
//     searchParams: { handle, fields: "id,title,variants" },
//   });
//   const { products } = await res.json();
//
//   await client.put(`variants/${id}`, { data: { variant: { id, price } } });
//
// Paths are relative to /admin/api/<version>/ and omit the .json suffix.
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const { createAdminRestApiClient } = require("@shopify/admin-api-client");

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2026-04";

if (!STORE || !TOKEN) {
  console.error(
    "ERROR: SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN must be set in .env",
  );
  process.exit(1);
}

const client = createAdminRestApiClient({
  storeDomain: STORE,
  apiVersion: API_VERSION,
  accessToken: TOKEN,
  retries: 2, // auto-retry on 429/5xx with exponential backoff
});

module.exports = { client, STORE, TOKEN, API_VERSION };
