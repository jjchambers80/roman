/**
 * create-bundle-discounts.js
 * Creates BUNDLE15/20/25 discount codes for the Build Your Own Bundle page.
 * Each code discounts items from collection 513621655834 (all-products) and
 * requires a minimum cart quantity (the bundle widget only ever adds items
 * from that collection, so cart qty == bundle item count). Cannot combine
 * with other order/product discounts (shipping discounts still stack).
 * Idempotent — checks for an existing code before creating.
 * Usage: node scripts/create-bundle-discounts.js
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const COLLECTION_GID = "gid://shopify/Collection/513621655834";

const GQL_URL = `https://${process.env.SHOPIFY_STORE}/admin/api/2026-04/graphql.json`;
const H = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
};

const TIERS = [
  { code: "BUNDLE15", title: "Bundle — 3 items, 15% off", percentage: 0.15, minQty: 3 },
  { code: "BUNDLE20", title: "Bundle — 4 items, 20% off", percentage: 0.2, minQty: 4 },
  { code: "BUNDLE25", title: "Bundle — 5+ items, 25% off", percentage: 0.25, minQty: 5 },
];

async function gql(query, variables) {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function codeExists(code) {
  const data = await gql(
    `query Q($code: String!) {
      codeDiscountNodeByCode(code: $code) { id }
    }`,
    { code },
  );
  return Boolean(data.data && data.data.codeDiscountNodeByCode);
}

async function createTier(tier) {
  const data = await gql(
    `mutation C($input: DiscountCodeBasicInput!) {
      discountCodeBasicCreate(basicCodeDiscount: $input) {
        codeDiscountNode { id }
        userErrors { field message }
      }
    }`,
    {
      input: {
        title: tier.title,
        code: tier.code,
        startsAt: new Date().toISOString(),
        customerSelection: { all: true },
        appliesOncePerCustomer: false,
        usageLimit: null,
        combinesWith: {
          orderDiscounts: false,
          productDiscounts: false,
          shippingDiscounts: true,
        },
        customerGets: {
          value: { percentage: tier.percentage },
          items: { collections: { add: [COLLECTION_GID] } },
        },
        minimumRequirement: {
          quantity: {
            greaterThanOrEqualToQuantity: String(tier.minQty),
          },
        },
      },
    },
  );

  const result = data.data && data.data.discountCodeBasicCreate;
  if (!result) {
    console.error(
      `❌ ${tier.code} — unexpected response:`,
      JSON.stringify(data).substring(0, 300),
    );
    return;
  }
  if (result.codeDiscountNode) {
    console.log(`✅ ${tier.code} — created (${result.codeDiscountNode.id})`);
  } else {
    const msgs = result.userErrors.map((e) => e.message).join("; ");
    console.error(`❌ ${tier.code} — ${msgs}`);
  }
}

async function run() {
  console.log("Creating BUNDLE15/20/25 discount codes…\n");
  for (const tier of TIERS) {
    if (await codeExists(tier.code)) {
      console.log(`⏭  ${tier.code} — already exists, skipping`);
      continue;
    }
    await createTier(tier);
  }
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
