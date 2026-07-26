/**
 * Syncs "Why this formula" card content to custom.why_this_formula.
 *
 * Usage:
 *   node scripts/update-product-formula-content.js         # preview
 *   node scripts/update-product-formula-content.js --apply # write to Shopify
 */
const { client, graphqlClient } = require("./shopify");

const APPLY = process.argv.includes("--apply");
const NAMESPACE = "custom";
const KEY = "why_this_formula";
const TYPE = "json";

const FORMULA_CONTENT_BY_HANDLE = {
  "balancing-skin-cleanser-for-all-skin-types": {
    subheading:
      "A foaming cleanser with antioxidant-rich botanicals, fruit oils, and clear sensitivity guidance.",
    points: [
      { heading: "Green tea + rooibos", text: "Botanical support for a balanced-looking complexion" },
      { heading: "Cranberry + rosehip + seabuckthorn oils", text: "Help maintain softness and moisture" },
      { heading: "Fresh foaming format", text: "Cleanses to a fresh, supple finish without a creamy residue" },
      { heading: "Fragrance-aware guidance", text: "Contains fragrance and geraniol; patch test first if skin is reactive or fragrance-sensitive" },
    ],
  },
  "illuminating-daily-serum-with-vitamin-c": {
    subheading: "A considered blend of antioxidants, peptides, and moisture-supporting ingredients.",
    points: [
      { heading: "Vitamin C + ferulic acid", text: "Antioxidant and radiance support" },
      { heading: "Kakadu plum + emblica", text: "Botanical antioxidant support" },
      { heading: "Peptides", text: "Support smoother-, renewed-looking skin" },
      { heading: "Hyaluronic acid + vitamin E", text: "Moisture support" },
    ],
  },
  "gentle-toner": {
    subheading:
      "An ultra-mild botanical toner that calms skin and fortifies moisture, formulated fragrance- and paraben-free.",
    points: [
      { heading: "pH-balanced botanicals", text: "Calms skin while fortifying topical moisture levels" },
      { heading: "Color, fragrance & paraben-free", text: "Formulated for those with particularly sensitive skin" },
      { heading: "Daily-use mist format", text: "Removes residue from cleanser, makeup, or hard water" },
      { heading: "Sensitivity-first guidance", text: "Recommended for ultra-sensitive and dry/sensitive skin types" },
    ],
  },
  "gentle-cleansing-milk": {
    subheading:
      "An ultra-mild cleansing milk with soothing botanicals that removes makeup and dirt without dryness.",
    points: [
      { heading: "Soothing botanical complex", text: "Nourishes and calms skin prone to sensitivity" },
      { heading: "Color, fragrance & paraben-free", text: "Formulated for ultra-sensitive, dry skin" },
      { heading: "Creamy milk format", text: "Gently removes dirt and makeup without over-stripping" },
      { heading: "Sensitivity-first guidance", text: "Best for ultra-sensitive and dry/sensitive skin types" },
    ],
  },
  "glass-glow-serum": {
    subheading: "A targeted peptide serum that helps smooth the look of fine lines and expression lines.",
    points: [
      { heading: "Targeted peptides", text: "Support smoother-, more refined-looking fine lines and expression lines" },
      { heading: "Lightweight formula", text: "Absorbs without adding complexity to your routine" },
      { heading: "Crow's-feet & forehead focus", text: "Formulated for the areas that show expression lines first" },
      { heading: "AM guidance", text: "Apply before moisturizer; follow with SPF in the morning" },
    ],
  },
  "ha-peptide-eye-creme": {
    subheading: "A hyaluronic acid and peptide eye crème that hydrates and revives the delicate eye area.",
    points: [
      { heading: "Hyaluronic acid + peptides", text: "Deeply hydrates and supports suppleness around the eyes" },
      { heading: "Botanical extracts + vitamins", text: "Nourish skin prone to loss of vibrancy" },
      { heading: "Natural illuminators", text: "Help revive the look of tired, dull under-eyes" },
      { heading: "AM & PM use", text: "Gently tap 1-2 drops onto the eye zone, morning and night" },
    ],
  },
  "hydrating-essence-with-hyaluronic-acid": {
    subheading:
      "A marine and hyaluronic acid-rich essence that fortifies and nourishes moisture-deficient skin.",
    points: [
      { heading: "Marine + hyaluronic acid", text: "Hydrates and restores moisture-deficient skin" },
      { heading: "Panthenol + copper peptides", text: "Enhance skin-conditioning and support resilience" },
      { heading: "Allantoin", text: "Helps fortify and nourish sensitive, dry-leaning skin" },
      { heading: "Cotton-pad application", text: "Apply after cleansing to boost the rest of your routine" },
    ],
  },
  "hyaluronic-serum-with-vitamin-e": {
    subheading:
      "A synergistic hyaluronic acid and vitamin E serum that delivers a quenching boost of hydration.",
    points: [
      { heading: "Hyaluronic acid + vitamin E", text: "Attracts and binds moisture where skin needs it most" },
      { heading: "High & low molecular weight proteins", text: "Target areas showing signs of natural aging" },
      { heading: "All-in-one hydrator", text: "Designed as an everyday staple in your routine" },
      { heading: "Layer before moisturizer", text: "Dispense 2-3 drops onto clean skin, then follow with moisturizer" },
    ],
  },
  "multi-peptide-moisture-creme": {
    subheading:
      "A luxurious peptide crème with sodium hyaluronate and aloe vera for deeply hydrated, supple-looking skin.",
    points: [
      { heading: "Hexa- & Tetrapeptides", text: "Help renew the look of skin" },
      { heading: "Sodium hyaluronate + aloe vera", text: "Encourage superbly hydrated, glowing-looking skin" },
      { heading: "Natural-source lipids", text: "Help revive complexion and combat dryness" },
      { heading: "Warm-and-smooth application", text: "Warm a small amount between palms after cleansing and toning" },
    ],
  },
  "pomegranate-eye-patches": {
    subheading:
      "Anti-aging eye patches with resveratrol and pomegranate extract, targeted for wrinkles, crow's feet, and under-eye bags.",
    points: [
      { heading: "Resveratrol + pomegranate extract", text: "Anti-aging powerhouse ingredients for the eye area" },
      { heading: "Targets visible aging", text: "Formulated for the look of wrinkles and crow's feet" },
      { heading: "De-puffing support", text: "Helps address the appearance of sagging under-eye bags" },
      { heading: "Targeted patch format", text: "Apply directly under eyes for a focused treatment" },
    ],
  },
  "revitalizing-serum-with-botanical-growth-factor": {
    subheading:
      "A powerful growth factor and peptide serum that helps reduce the look of fine lines and revitalize aging skin.",
    points: [
      { heading: "Botanical growth factor", text: "Helps revitalize the look of aging skin" },
      { heading: "Peptides", text: "Support the appearance of reduced fine lines" },
      { heading: "Professional-grade formula", text: "Developed for visible, dermatologist-caliber results" },
      { heading: "Daily routine fit", text: "Apply after cleansing and toning, before moisturizer" },
    ],
  },
};

function userErrorMessage(errors) {
  return errors.map((error) => error.message).join("; ");
}

async function ensureDefinition() {
  const query = `#graphql
    query ProductFormulaContentDefinition {
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
      mutation UpdateProductFormulaContentDefinition(
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
    mutation CreateProductFormulaContentDefinition(
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
        name: "Why This Formula",
        description:
          "Subheading + up to 4 heading/text ingredient-benefit cards for the PDP 'Why this formula' section.",
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

async function upsertFormulaContent(product, value) {
  const serialized = JSON.stringify(value);
  const existing = await getExistingMetafield(product.id);
  if (existing?.value === serialized) return "unchanged";
  if (!APPLY) return existing ? "would update" : "would create";

  if (existing) {
    const response = await client.put(`metafields/${existing.id}`, {
      data: { metafield: { id: existing.id, value: serialized } },
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
        value: serialized,
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
  const missingProducts = Object.keys(FORMULA_CONTENT_BY_HANDLE).filter(
    (handle) => !productsByHandle.has(handle),
  );

  if (missingProducts.length) {
    console.error(`Missing products: ${missingProducts.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log(APPLY ? "Applying formula content..." : "Previewing formula content...");
  if (APPLY) console.log(`Metafield definition: ${await ensureDefinition()}`);

  for (const [handle, value] of Object.entries(FORMULA_CONTENT_BY_HANDLE)) {
    const product = productsByHandle.get(handle);
    const action = await upsertFormulaContent(product, value);
    console.log(`${action.padEnd(12)} ${product.title} (${product.status})`);
  }
}

run().catch((error) => {
  console.error("Product formula content sync failed:", error.message);
  process.exit(1);
});
