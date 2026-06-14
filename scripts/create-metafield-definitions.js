/**
 * create-metafield-definitions.js
 * Registers metafield definitions with PUBLIC_READ storefront access so
 * product.metafields.custom.tab_* is accessible in Liquid.
 * Usage: node scripts/create-metafield-definitions.js
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const GQL_URL = `https://${process.env.SHOPIFY_STORE}/admin/api/2026-04/graphql.json`;
const H = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
};

const DEFINITIONS = [
  { name: "Tab Description", key: "tab_description" },
  { name: "Tab Usage", key: "tab_usage" },
  { name: "Tab Ingredients", key: "tab_ingredients" },
];

// IDs from the already-created definitions
const EXISTING_IDS = {
  tab_description: "gid://shopify/MetafieldDefinition/217478267162",
  tab_usage: "gid://shopify/MetafieldDefinition/217478299930",
  tab_ingredients: "gid://shopify/MetafieldDefinition/217478332698",
};

async function gql(query, variables) {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function updateStorefrontAccess(def) {
  const data = await gql(
    `mutation U($input: MetafieldDefinitionUpdateInput!) {
      metafieldDefinitionUpdate(definition: $input) {
        updatedDefinition { key access { storefront } }
        userErrors { field message }
      }
    }`,
    {
      input: {
        key: def.key,
        namespace: "custom",
        ownerType: "PRODUCT",
        access: { storefront: "PUBLIC_READ" },
      },
    },
  );

  const result = data.data && data.data.metafieldDefinitionUpdate;
  if (!result) {
    console.error(
      `❌ ${def.key} — unexpected response:`,
      JSON.stringify(data).substring(0, 300),
    );
    return;
  }
  if (result.updatedDefinition) {
    console.log(
      `✅ ${def.key} — storefront access: ${result.updatedDefinition.access.storefront}`,
    );
  } else {
    const msgs = result.userErrors.map((e) => e.message).join("; ");
    console.error(`❌ ${def.key} — ${msgs}`);
  }
}

async function run() {
  console.log(
    "Setting storefront access to PUBLIC_READ on tab metafield definitions…\n",
  );
  for (const def of DEFINITIONS) {
    await updateStorefrontAccess(def);
  }
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
