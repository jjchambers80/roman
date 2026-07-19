/**
 * Syncs concise PDP value propositions to custom.value_proposition.
 *
 * Usage:
 *   node scripts/update-product-value-propositions.js         # preview
 *   node scripts/update-product-value-propositions.js --apply # write to Shopify
 */
const { client, graphqlClient } = require("./shopify");

const APPLY = process.argv.includes("--apply");
const NAMESPACE = "custom";
const KEY = "value_proposition";
const TYPE = "single_line_text_field";

const VALUE_PROPOSITIONS_BY_HANDLE = {
  "balancing-skin-cleanser-for-all-skin-types":
    "A fresh foaming cleanse with green tea, rooibos, and fruit oils that leaves skin feeling clean, comfortable, and ready for the next step.",
  "gentle-toner":
    "A gentle daily toner with hyaluronic acid, panthenol, and botanical extracts that helps replenish moisture and leaves sensitive skin feeling calm and conditioned.",
  "gentle-cleansing-milk":
    "A creamy cleansing milk with shea butter, avocado, and sunflower oils that gently lifts makeup and residue while leaving dry, sensitive skin soft and comfortable.",
  "glass-glow-serum":
    "A lightweight peptide serum that targets the look of fine lines and expression lines, helping skin appear smoother and more refined without weighing down your routine.",
  "ha-peptide-eye-creme":
    "A moisture-rich eye creme with hyaluronic acid, peptides, and botanical extracts that hydrates the delicate eye area and revives the look of tired eyes.",
  "hydrating-essence-with-hyaluronic-acid":
    "A hydrating essence with hyaluronic acid, panthenol, copper peptide, and marine extracts that replenishes moisture and leaves skin feeling soft and conditioned.",
  "hyaluronic-serum-with-vitamin-e":
    "A concentrated hyaluronic acid and vitamin E serum that helps attract and hold moisture, leaving dry, dehydrated skin feeling smooth, soft, and replenished.",
  "illuminating-daily-serum-with-vitamin-c":
    "A lightweight vitamin C serum with ferulic acid, peptides, and multi-source antioxidants that helps brighten dull-looking skin while supporting moisture and natural radiance.",
  "multi-peptide-moisture-creme":
    "A rich multi-peptide moisturizer with hyaluronic acid and aloe that replenishes moisture, softens the feel of dry skin, and supports a smooth, hydrated glow.",
  "pomegranate-eye-patches":
    "Targeted eye patches with pomegranate and resveratrol that help soften the look of under-eye lines and bags while providing antioxidant support.",
  "revitalizing-serum-with-botanical-growth-factor":
    "A revitalizing peptide serum with hyaluronic acid and fruit acids that helps hydrate, smooth, and refine the look of dull, uneven texture.",
};

function userErrorMessage(errors) {
  return errors.map((error) => error.message).join("; ");
}

async function ensureDefinition() {
  const query = `#graphql
    query ProductValuePropositionDefinition {
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
      throw new Error(`${NAMESPACE}.${KEY} is ${definition.type.name}; expected ${TYPE}`);
    }
    if (definition.access.storefront === "PUBLIC_READ") return "ready";

    const update = `#graphql
      mutation UpdateProductValuePropositionDefinition(
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
    if (errors.length) throw new Error(userErrorMessage(errors));
    return "updated";
  }

  const create = `#graphql
    mutation CreateProductValuePropositionDefinition(
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
        name: "Product Value Proposition",
        description:
          "Short product-specific copy displayed between the product title and benefit bullets.",
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
  if (errors.length) throw new Error(userErrorMessage(errors));
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

async function upsertValueProposition(product, value) {
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
  const productsByHandle = new Map(products.map((product) => [product.handle, product]));
  const missingCopy = products.filter(
    (product) => !VALUE_PROPOSITIONS_BY_HANDLE[product.handle],
  );
  const missingProducts = Object.keys(VALUE_PROPOSITIONS_BY_HANDLE).filter(
    (handle) => !productsByHandle.has(handle),
  );

  if (missingCopy.length || missingProducts.length) {
    if (missingCopy.length) {
      console.error(`Missing copy: ${missingCopy.map((product) => product.handle).join(", ")}`);
    }
    if (missingProducts.length) {
      console.error(`Missing products: ${missingProducts.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(APPLY ? "Applying product value propositions..." : "Previewing product value propositions...");
  if (APPLY) console.log(`Metafield definition: ${await ensureDefinition()}`);

  for (const [handle, value] of Object.entries(VALUE_PROPOSITIONS_BY_HANDLE)) {
    const product = productsByHandle.get(handle);
    const action = await upsertValueProposition(product, value);
    console.log(`${action.padEnd(12)} ${product.title} (${product.status})`);
  }
}

run().catch((error) => {
  console.error("Product value proposition sync failed:", error.message);
  process.exit(1);
});
