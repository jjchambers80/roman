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
  quiet: true,
});
const {
  createAdminApiClient,
  createAdminRestApiClient,
} = require("@shopify/admin-api-client");

const STORE = process.env.SHOPIFY_STORE;
const CLIENT_ID = process.env.SHOPIFY_API_KEY;
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET;
const LEGACY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2026-04";

if (!STORE || ((!CLIENT_ID || !CLIENT_SECRET) && !LEGACY_TOKEN)) {
  console.error(
    "ERROR: Set SHOPIFY_STORE plus SHOPIFY_API_KEY/SHOPIFY_API_SECRET (or legacy SHOPIFY_ACCESS_TOKEN) in .env",
  );
  process.exit(1);
}

let token;
let tokenExpiresAt = 0;
let tokenRequest;
let restClient;
let restClientToken;
let adminApiClient;
let adminApiClientToken;

async function requestAccessToken() {
  const response = await fetch(
    `https://${STORE}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    },
  );
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(
      `Shopify token exchange failed (${response.status}): ${body.error_description || body.error || "unknown error"}`,
    );
  }

  token = body.access_token;
  tokenExpiresAt = Date.now() + body.expires_in * 1000;
  return token;
}

async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) return LEGACY_TOKEN;
  if (token && Date.now() < tokenExpiresAt - 60_000) return token;

  if (!tokenRequest) {
    tokenRequest = requestAccessToken().finally(() => {
      tokenRequest = undefined;
    });
  }
  return tokenRequest;
}

async function getRestClient() {
  const accessToken = await getAccessToken();
  if (!restClient || restClientToken !== accessToken) {
    restClient = createAdminRestApiClient({
      storeDomain: STORE,
      apiVersion: API_VERSION,
      accessToken,
      retries: 2,
    });
    restClientToken = accessToken;
  }
  return restClient;
}

async function getAdminApiClient() {
  const accessToken = await getAccessToken();
  if (!adminApiClient || adminApiClientToken !== accessToken) {
    adminApiClient = createAdminApiClient({
      storeDomain: STORE,
      apiVersion: API_VERSION,
      accessToken,
      retries: 2,
    });
    adminApiClientToken = accessToken;
  }
  return adminApiClient;
}

const client = Object.fromEntries(
  ["get", "post", "put", "delete"].map((method) => [
    method,
    async (...args) => (await getRestClient())[method](...args),
  ]),
);

const graphqlClient = {
  request: async (...args) => (await getAdminApiClient()).request(...args),
};

module.exports = {
  client,
  graphqlClient,
  getAccessToken,
  STORE,
  API_VERSION,
};
