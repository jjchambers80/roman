/**
 * Syncs cleanser suitability and finish guidance to product metafields.
 *
 * Usage:
 *   node scripts/update-cleanser-guidance.js         # preview
 *   node scripts/update-cleanser-guidance.js --apply # write to Shopify
 */
const { createAdminApiClient } = require("@shopify/admin-api-client");
const { client, STORE, TOKEN, API_VERSION } = require("./shopify");

const APPLY = process.argv.includes("--apply");
const NAMESPACE = "custom";

const DEFINITIONS = {
  suitable_skin_types: {
    name: "Suitable skin types",
    description:
      "Customer-facing skin types shown in the product guidance panel.",
    type: "list.single_line_text_field",
  },
  expected_finish: {
    name: "Expected finish",
    description: "How skin is expected to feel or look immediately after use.",
    type: "single_line_text_field",
  },
  sensitivity_guidance: {
    name: "Sensitivity guidance",
    description:
      "Visible guidance for shoppers with dry, reactive, or fragrance-sensitive skin.",
    type: "multi_line_text_field",
  },
};

const GUIDANCE_BY_HANDLE = {
  "balancing-skin-cleanser-for-all-skin-types": {
    suitable_skin_types: ["Normal", "Combination", "Oily", "Mature"],
    expected_finish:
      "Fresh, clean, supple, and balanced-looking—not a creamy residue.",
    sensitivity_guidance:
      "Contains fragrance, geraniol, and multiple cleansing agents. Patch test first if your skin is dry, reactive, or fragrance-sensitive; choose a creamier cleanser if skin feels tight after rinsing.",
  },
  "gentle-cleansing-milk": {
    suitable_skin_types: ["Dry", "Moisture-depleted", "Sensitive-leaning"],
    expected_finish:
      "Soft, silky, and comfortable—not tight or squeaky-clean.",
    sensitivity_guidance:
      "Contains fragrance. Patch test first if your skin is highly reactive or fragrance-sensitive, even though the creamy base is intended to minimize a stripped feeling.",
  },
};

const graphqlClient = createAdminApiClient({
  storeDomain: STORE,
  apiVersion: API_VERSION,
  accessToken: TOKEN,
  retries: 2,
});

function getUserErrorMessage(errors) {
  return errors.map((error) => error.message).join("; ");
}

async function ensureDefinition(key, definition) {
  const query = `#graphql
    query ProductGuidanceDefinition {
      metafieldDefinitions(
        first: 1
        ownerType: PRODUCT
        namespace: "${NAMESPACE}"
        key: "${key}"
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

  const existing = result.data.metafieldDefinitions.nodes[0];
  if (existing) {
    if (existing.type.name !== definition.type) {
      throw new Error(
        `${NAMESPACE}.${key} is ${existing.type.name}; expected ${definition.type}`,
      );
    }
    if (existing.access.storefront === "PUBLIC_READ") return "ready";

    const update = `#graphql
      mutation UpdateProductGuidanceDefinition(
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
          key,
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
    mutation CreateProductGuidanceDefinition(
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
        ...definition,
        namespace: NAMESPACE,
        key,
        ownerType: "PRODUCT",
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

async function getGuidanceMetafields(productId) {
  const response = await client.get(`products/${productId}/metafields`, {
    searchParams: { namespace: NAMESPACE, limit: "250" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return new Map(
    data.metafields
      .filter((metafield) => DEFINITIONS[metafield.key])
      .map((metafield) => [metafield.key, metafield]),
  );
}

async function upsertGuidance(product, guidance) {
  const existingByKey = await getGuidanceMetafields(product.id);
  const actions = [];

  for (const [key, rawValue] of Object.entries(guidance)) {
    const definition = DEFINITIONS[key];
    const value = Array.isArray(rawValue) ? JSON.stringify(rawValue) : rawValue;
    const existing = existingByKey.get(key);

    if (existing?.value === value) {
      actions.push(`${key}: unchanged`);
      continue;
    }
    if (!APPLY) {
      actions.push(`${key}: ${existing ? "would update" : "would create"}`);
      continue;
    }

    if (existing) {
      const response = await client.put(`metafields/${existing.id}`, {
        data: { metafield: { id: existing.id, value } },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(JSON.stringify(data));
      actions.push(`${key}: updated`);
      continue;
    }

    const response = await client.post(`products/${product.id}/metafields`, {
      data: {
        metafield: {
          namespace: NAMESPACE,
          key,
          type: definition.type,
          value,
        },
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    actions.push(`${key}: created`);
  }

  return actions.join(", ");
}

async function run() {
  const products = await getProducts();
  const productsByHandle = new Map(
    products.map((product) => [product.handle, product]),
  );
  const missingProducts = Object.keys(GUIDANCE_BY_HANDLE).filter(
    (handle) => !productsByHandle.has(handle),
  );

  if (missingProducts.length) {
    throw new Error(`Missing products: ${missingProducts.join(", ")}`);
  }

  console.log(
    APPLY ? "Applying cleanser guidance..." : "Previewing cleanser guidance...",
  );
  if (APPLY) {
    for (const [key, definition] of Object.entries(DEFINITIONS)) {
      console.log(
        `Metafield definition ${key}: ${await ensureDefinition(key, definition)}`,
      );
    }
  }

  for (const [handle, guidance] of Object.entries(GUIDANCE_BY_HANDLE)) {
    const product = productsByHandle.get(handle);
    const actions = await upsertGuidance(product, guidance);
    console.log(`${product.title} (${product.status}): ${actions}`);
  }
}

run().catch((error) => {
  console.error("Cleanser guidance sync failed:", error.message);
  process.exit(1);
});
