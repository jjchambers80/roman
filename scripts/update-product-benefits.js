/**
 * Syncs concise PDP benefit bullets to custom.product_benefits.
 *
 * Usage:
 *   node scripts/update-product-benefits.js         # preview
 *   node scripts/update-product-benefits.js --apply # write to Shopify
 */
const { client, graphqlClient } = require("./shopify");

const APPLY = process.argv.includes("--apply");
const NAMESPACE = "custom";
const KEY = "product_benefits";
const TYPE = "list.single_line_text_field";

const BENEFITS_BY_HANDLE = {
  "balancing-skin-cleanser-for-all-skin-types": [
    "Refreshes without leaving skin feeling depleted",
    "Green tea and rooibos help support a balanced-looking complexion",
    "Fruit oils help maintain softness and moisture",
  ],
  "gentle-toner": [
    "Leaves sensitive skin feeling calm with an ultra-mild, daily-use formula",
    "Helps replenish moisture after cleansing",
    "pH-balanced and free from color, fragrance, and parabens",
  ],
  "gentle-cleansing-milk": [
    "Gently lifts dirt and makeup without over-stripping",
    "Shea butter and botanicals help nourish dry, sensitive skin",
    "Leaves skin feeling calm, soft, and comfortable",
  ],
  "glass-glow-serum": [
    "Softens the look of fine lines and expression lines",
    "Peptides support a smoother, more refined-looking surface",
    "Lightweight texture layers easily under moisturizer",
  ],
  "ha-peptide-eye-creme": [
    "Deeply hydrates the delicate eye area",
    "Peptides and botanical extracts support softer, more supple-looking skin",
    "Natural illuminators help revive the look of tired eyes",
  ],
  "hydrating-essence-with-hyaluronic-acid": [
    "Replenishes moisture in dehydrated-feeling skin",
    "Hyaluronic acid and panthenol support a soft, conditioned feel",
    "Copper peptide and marine extracts help nourish the complexion",
  ],
  "hyaluronic-serum-with-vitamin-e": [
    "Delivers a concentrated boost of hydration",
    "Hyaluronic acid and vitamin E support smooth, supple-looking skin",
    "Leaves dry, dehydrated skin feeling soft and replenished",
  ],
  "illuminating-daily-serum-with-vitamin-c": [
    "Helps brighten the look of dull, uneven skin",
    "Multi-source antioxidants support skin exposed to daily stressors",
    "Vitamin C, ferulic acid, and vitamin E help maintain moisture",
  ],
  "multi-peptide-moisture-creme": [
    "Replenishes moisture for softer, more supple-feeling skin",
    "Peptides help renew the look of tired, mature skin",
    "Hyaluronic acid and aloe support a smooth, hydrated glow",
  ],
  "pomegranate-eye-patches": [
    "Helps soften the look of crow's feet and under-eye lines",
    "Pomegranate and resveratrol provide antioxidant support",
    "Helps improve the look of under-eye bags",
  ],
  "revitalizing-serum-with-botanical-growth-factor": [
    "Helps smooth and refine the look of skin",
    "Hyaluronic acid helps keep skin feeling hydrated and supple",
    "Fruit acids gently improve the appearance of dull, uneven texture",
  ],
};

function getUserErrorMessage(errors) {
  return errors.map((error) => error.message).join("; ");
}

async function ensureDefinition() {
  const query = `#graphql
    query ProductBenefitsDefinition {
      metafieldDefinitions(
        first: 1
        ownerType: PRODUCT
        namespace: "${NAMESPACE}"
        key: "${KEY}"
      ) {
        nodes {
          type { name }
          access { storefront }
        }
      }
    }
  `;
  const result = await graphqlClient.request(query);
  if (result.errors) throw new Error(JSON.stringify(result.errors));

  const definition = result.data.metafieldDefinitions.nodes[0];
  if (definition) {
    if (definition.type.name !== TYPE) {
      throw new Error(
        `${NAMESPACE}.${KEY} is ${definition.type.name}; expected ${TYPE}`,
      );
    }
    if (definition.access.storefront === "PUBLIC_READ") return "ready";

    const update = `#graphql
      mutation UpdateProductBenefitsDefinition(
        $definition: MetafieldDefinitionUpdateInput!
      ) {
        metafieldDefinitionUpdate(definition: $definition) {
          updatedDefinition { key }
          userErrors { message }
        }
      }
    `;
    const updated = await graphqlClient.request(update, {
      variables: {
        definition: {
          namespace: NAMESPACE,
          key: KEY,
          ownerType: "PRODUCT",
          access: { storefront: "PUBLIC_READ" },
        },
      },
    });
    if (updated.errors) throw new Error(JSON.stringify(updated.errors));
    const errors = updated.data.metafieldDefinitionUpdate.userErrors;
    if (errors.length) throw new Error(getUserErrorMessage(errors));
    return "updated";
  }

  const create = `#graphql
    mutation CreateProductBenefitsDefinition(
      $definition: MetafieldDefinitionInput!
    ) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { key }
        userErrors { message }
      }
    }
  `;
  const created = await graphqlClient.request(create, {
    variables: {
      definition: {
        name: "Product Benefits",
        description:
          "Concise customer-facing benefits displayed above the product page add-to-cart button.",
        namespace: NAMESPACE,
        key: KEY,
        ownerType: "PRODUCT",
        type: TYPE,
        access: { storefront: "PUBLIC_READ" },
      },
    },
  });
  if (created.errors) throw new Error(JSON.stringify(created.errors));
  const errors = created.data.metafieldDefinitionCreate.userErrors;
  if (errors.length) throw new Error(getUserErrorMessage(errors));
  return "created";
}

async function getProducts() {
  const response = await client.get("products", {
    searchParams: { limit: "250", fields: "id,title,handle,status" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data.products;
}

async function getExistingMetafield(productId) {
  const response = await client.get(`products/${productId}/metafields`, {
    searchParams: { namespace: NAMESPACE, key: KEY },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data.metafields?.[0] ?? null;
}

async function upsertBenefits(product, benefits) {
  const value = JSON.stringify(benefits);
  const existing = await getExistingMetafield(product.id);

  if (existing?.value === value) return "unchanged";
  if (!APPLY) return existing ? "would update" : "would create";

  if (existing) {
    const response = await client.put(`metafields/${existing.id}`, {
      data: { metafield: { id: existing.id, value } },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return "updated";
  }

  const response = await client.post(`products/${product.id}/metafields`, {
    data: {
      metafield: {
        namespace: NAMESPACE,
        key: KEY,
        type: TYPE,
        value,
      },
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return "created";
}

async function run() {
  const products = await getProducts();
  const productsByHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  const missingCopy = products.filter(
    (product) => !BENEFITS_BY_HANDLE[product.handle],
  );
  const missingProducts = Object.keys(BENEFITS_BY_HANDLE).filter(
    (handle) => !productsByHandle.has(handle),
  );

  if (missingCopy.length || missingProducts.length) {
    if (missingCopy.length) {
      console.error(
        `Missing benefit copy: ${missingCopy.map((product) => product.handle).join(", ")}`,
      );
    }
    if (missingProducts.length) {
      console.error(`Missing products: ${missingProducts.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    APPLY ? "Applying product benefits..." : "Previewing product benefits...",
  );
  if (APPLY) {
    console.log(`Metafield definition: ${await ensureDefinition()}`);
  }

  for (const [handle, benefits] of Object.entries(BENEFITS_BY_HANDLE)) {
    const product = productsByHandle.get(handle);
    const action = await upsertBenefits(product, benefits);
    console.log(`${action.padEnd(12)} ${product.title} (${product.status})`);
  }
}

run().catch((error) => {
  console.error("Product benefit sync failed:", error.message);
  process.exit(1);
});
