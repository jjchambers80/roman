/**
 * update-seo.js
 * Applies all SEO recommendations from the 2026-04-23 audit.
 *
 * Covers:
 *  - Homepage SEO title + meta description (shop-level metafields)
 *  - All collection descriptions (body_html) + SEO title + SEO meta description
 *  - All product SEO meta descriptions
 *  - URL redirects
 *
 * Usage: node scripts/update-seo.js [--product <handle>] [--dry-run]
 * Requires: SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN in .env
 */

const { client, STORE } = require("./shopify");

const args = process.argv.slice(2);
const productArgIndex = args.indexOf("--product");
const TARGET_PRODUCT = productArgIndex >= 0 ? args[productArgIndex + 1] : null;
const DRY_RUN = args.includes("--dry-run");

if (productArgIndex >= 0 && !TARGET_PRODUCT) throw new Error("--product requires a product handle");

async function apiGet(path) {
  const [pathname, query = ""] = path.split("?");
  const searchParams = {};
  for (const [key, value] of new URLSearchParams(query)) {
    searchParams[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  const res = await client.get(pathname.replace(/^\//, "").replace(/\.json$/, ""), {
    searchParams,
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPost(path, body) {
  if (DRY_RUN) return { dryRun: true, path, body };
  const res = await client.post(path.replace(/^\//, "").replace(/\.json$/, ""), { data: body });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPut(path, body) {
  if (DRY_RUN) return { dryRun: true, path, body };
  const res = await client.put(path.replace(/^\//, "").replace(/\.json$/, ""), { data: body });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Upsert a metafield on a resource. Creates if not found, updates if exists.
 */
async function upsertMetafield(resourcePath, namespace, key, value, type = "single_line_text_field") {
  // Check for existing metafield
  const data = await apiGet(`${resourcePath}/metafields.json?namespace=${namespace}&key=${key}`);
  if (data.metafields && data.metafields.length > 0) {
    const existing = data.metafields[0];
    if (DRY_RUN) return existing.value === value ? "unchanged (dry run)" : "would update";
    await apiPut(`/metafields/${existing.id}.json`, { metafield: { id: existing.id, value } });
    return "updated";
  } else {
    if (DRY_RUN) return "would create";
    await apiPost(`${resourcePath}/metafields.json`, { metafield: { namespace, key, value, type } });
    return "created";
  }
}

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------

const HOMEPAGE = {
  title: "Roman Skin | Clinical Skincare by a CIDESCO-Certified Esthetician",
  description:
    "Spa-grade skincare built on 30+ years of clinical esthetics. Peptide-powered formulas for visible results — created by a CIDESCO-certified esthetician. Shop now.",
};

const COLLECTIONS = [
  {
    handle: "cleansers",
    seoTitle: "Face Cleansers | Roman Skin",
    seoDescription:
      "Clinically inspired face cleansers by a CIDESCO esthetician. Sulfate & paraben-free formulas that cleanse without stripping your moisture barrier.",
    bodyHtml: `<p>Healthy skin starts with a proper cleanse. Our clinically inspired cleansers are formulated by Betty Romàn — a CIDESCO-certified esthetician with 30+ years of practice — to remove impurities, excess oil, and environmental residue without stripping the skin's natural moisture barrier.</p><p>Each formula is free from sulfates, parabens, and artificial fillers. Whether your skin is oily, dry, sensitive, or combination, the right cleanser sets the foundation for every step that follows.</p>`,
  },
  {
    handle: "serums",
    seoTitle: "Face Serums | Roman Skin",
    seoDescription:
      "Peptide-powered face serums by a CIDESCO esthetician. Vitamin C, hyaluronic acid, and botanical growth factors for targeted, visible results. $95–$155.",
    bodyHtml: `<p>Targeted, peptide-powered serums formulated for visible transformation. Created by a CIDESCO-certified esthetician with 30+ years of clinical expertise, each serum addresses a specific skin concern — brightening with stabilized Vitamin C, deep hydration with hyaluronic acid, or advanced anti-aging with botanical growth factors and peptides.</p><p>Layer one or combine strategically for a complete clinical-grade routine.</p>`,
  },
  {
    handle: "eye-care",
    seoTitle: "Eye Crème & Eye Care | Roman Skin",
    seoDescription:
      "HA Peptide Eye Crème with hyaluronic acid and peptides for fine lines, dark circles, and firmness around the eyes. Clinical-grade. Paraben-free. $95.",
    bodyHtml: `<p>The eye area demands specialized care. Thinner and more delicate than the rest of the face, the skin around your eyes shows fatigue, fine lines, and dark circles first. Our HA Peptide Eye Crème delivers concentrated hyaluronic acid and multi-peptide technology to hydrate, firm, and smooth — formulated by a licensed esthetician who knows exactly what this zone needs.</p>`,
  },
  {
    handle: "toners",
    seoTitle: "Facial Toners | Roman Skin",
    seoDescription:
      "Alcohol-free facial toner that balances skin pH after cleansing and preps for serums. Clinically inspired, fragrance-free, suitable for sensitive skin. $47.",
    bodyHtml: `<p>A properly formulated toner balances the skin's pH after cleansing and preps it to absorb serums more effectively. Our Gentle Toner is free from alcohol and synthetic fragrance — designed to soothe and condition, not strip. Formulated with the same clinical approach Betty Romàn brings to every treatment in her spa.</p>`,
  },
  {
    handle: "fine-lines-wrinkles",
    seoTitle: "Skincare for Fine Lines & Wrinkles | Roman Skin",
    seoDescription:
      "Clinical-grade peptide serums and creams for fine lines and wrinkles. Formulated by a CIDESCO-certified esthetician for visible results at home.",
    bodyHtml: `<p>Clinical-grade formulas for visibly smoother, firmer skin. These products target the appearance of fine lines and wrinkles through peptide technology, hyaluronic acid, and botanical growth factors — ingredients selected for clinical performance by a CIDESCO-certified esthetician.</p><p>Consistent use delivers the kind of results clients expect from a professional facial, at home.</p>`,
  },
  {
    handle: "hyperpigmentation",
    seoTitle: "Skincare for Hyperpigmentation | Roman Skin",
    seoDescription:
      "Vitamin C serums and brightening formulas for hyperpigmentation and dark spots. Clinically developed by Betty Romàn for even, radiant skin over time.",
    bodyHtml: `<p>Uneven skin tone, dark spots, and post-inflammatory pigmentation respond to the right actives applied consistently. Our hyperpigmentation collection features stabilized Vitamin C, brightening botanicals, and antioxidant-rich serums formulated to fade discoloration and reveal a more even, radiant complexion over time.</p><p>Developed by Betty Romàn, whose clients have seen measurable results for over 30 years.</p>`,
  },
  {
    handle: "dull-uneven-skin",
    seoTitle: "Skincare for Dull & Uneven Skin | Roman Skin",
    seoDescription:
      "Brightening serums with stabilized Vitamin C and antioxidants for dull, uneven skin. Clinical-grade radiance by a CIDESCO esthetician. Shop now.",
    bodyHtml: `<p>Dullness is usually a sign of slow cell turnover, dehydration, or oxidative stress. These formulas deliver the actives your skin needs to brighten and resurface: stabilized Vitamin C for luminosity, antioxidants to neutralize free radicals, and hydration to restore glow.</p><p>Clinical results without the clinic price tag.</p>`,
  },
  {
    handle: "dryness-dehydration",
    seoTitle: "Skincare for Dry & Dehydrated Skin | Roman Skin",
    seoDescription:
      "Hyaluronic acid serums and peptide moisturizers for dry and dehydrated skin. Barrier-restoring formulas. Paraben-free. By Betty Romàn, CIDESCO esthetician.",
    bodyHtml: `<p>Dry skin needs lipids. Dehydrated skin needs water. Most skin needs both. Our dryness and dehydration collection delivers deep moisture through hyaluronic acid and peptide-enriched creams that strengthen the barrier, lock in hydration, and restore a plump, healthy look — without the heaviness of traditional drugstore moisturizers.</p>`,
  },
  {
    handle: "all-products",
    seoTitle: "Shop All Skincare | Roman Skin",
    seoDescription:
      "Shop all Roman Skin Care products. Clinical-grade peptide serums, cleansers, toners, and eye crème by a CIDESCO-certified esthetician. Free of parabens.",
    bodyHtml: `<p>Every Roman Skin Care product is formulated by Betty Romàn — a CIDESCO-certified esthetician with 30+ years of clinical practice. Clean, results-driven formulas built on peptide science, hyaluronic acid, and stabilized Vitamin C. Free from parabens, sulfates, and unnecessary fillers.</p>`,
  },
];

const PRODUCTS = [
  {
    handle: "balancing-skin-cleanser-for-all-skin-types",
    descriptionTag:
      "Gentle foaming cleanser with Vitamin C, antioxidants & natural fruit oils. Formulated by a CIDESCO esthetician for all skin types. Paraben-free. $43.",
  },
  {
    handle: "gentle-cleansing-milk",
    descriptionTag:
      "Creamy non-stripping cleansing milk that dissolves makeup and impurities while preserving moisture. Clinically formulated for dry and sensitive skin. $43.",
  },
  {
    handle: "gentle-toner",
    descriptionTag:
      "Alcohol-free facial toner that balances pH, soothes, and preps skin for serums. Clinically inspired by Betty Romàn, CIDESCO-certified esthetician. $47.",
  },
  {
    handle: "ha-peptide-eye-creme",
    descriptionTag:
      "Concentrated hyaluronic acid and multi-peptide eye crème. Hydrates, firms, and smooths fine lines around the eyes. Clinically formulated. Paraben-free. $95.",
  },
  {
    handle: "hyaluronic-serum-with-vitamin-e",
    descriptionTag:
      "Deep hydration serum with hyaluronic acid and Vitamin E. Plumps skin, restores moisture barrier, and softens texture. All skin types. Paraben-free. $95.",
  },
  {
    handle: "illuminating-daily-serum-with-vitamin-c",
    descriptionTag:
      "Vitamin C and ferulic acid serum that helps brighten dull, uneven-looking skin, support moisture, and promote natural radiance. 1 fl oz. $145.",
  },
  {
    handle: "multi-peptide-moisture-creme",
    descriptionTag:
      "Rich peptide moisturizer that firms, hydrates, and supports skin renewal. Clinically inspired by Betty Romàn for all skin types. Clean formula. $78.",
  },
  {
    handle: "revitalizing-serum-with-botanical-growth-factor",
    descriptionTag:
      "Advanced anti-aging serum with botanical growth factors and peptides for visible firmness and texture improvement. Clinical results. Paraben-free. $155.",
  },
];

const REDIRECTS = [
  { path: "/collections/all", target: "/collections/all-products" },
  { path: "/pages/about-roman-skin-care", target: "/pages/about-betty-roman" },
];

// ---------------------------------------------------------------------------
// TASKS
// ---------------------------------------------------------------------------

async function updateHomepageSEO() {
  console.log("\n── Homepage SEO ──────────────────────────────────────────");
  // Shop-level metafields: GET /metafields.json returns shop-scoped metafields
  const titleStatus = await upsertMetafield("", "global", "title_tag", HOMEPAGE.title);
  console.log(`  title_tag: ${titleStatus}`);
  const descStatus = await upsertMetafield("", "global", "description_tag", HOMEPAGE.description);
  console.log(`  description_tag: ${descStatus}`);
}

async function buildCollectionMap() {
  const [customData, smartData] = await Promise.all([
    apiGet("/custom_collections.json?fields=id,handle&limit=250"),
    apiGet("/smart_collections.json?fields=id,handle&limit=250"),
  ]);
  const map = {};
  for (const c of customData.custom_collections || []) map[c.handle] = { id: c.id, type: "custom" };
  for (const c of smartData.smart_collections || []) map[c.handle] = { id: c.id, type: "smart" };
  return map;
}

async function updateCollections(collectionMap) {
  console.log("\n── Collections ───────────────────────────────────────────");
  for (const col of COLLECTIONS) {
    const entry = collectionMap[col.handle];
    if (!entry) {
      console.log(`  [SKIP] ${col.handle} — not found in store`);
      continue;
    }
    const { id, type } = entry;
    const endpoint = type === "custom" ? `/custom_collections/${id}.json` : `/smart_collections/${id}.json`;
    const resourcePath = type === "custom" ? `/custom_collections/${id}` : `/smart_collections/${id}`;
    const resourceKey = type === "custom" ? "custom_collection" : "smart_collection";

    // Update body_html (visible description)
    await apiPut(endpoint, { [resourceKey]: { id, body_html: col.bodyHtml } });

    // SEO title_tag metafield
    await upsertMetafield(resourcePath, "global", "title_tag", col.seoTitle);

    // SEO description_tag metafield
    await upsertMetafield(resourcePath, "global", "description_tag", col.seoDescription);

    console.log(`  ✓ ${col.handle}`);
  }
}

async function buildProductMap() {
  const data = await apiGet("/products.json?fields=id,handle&limit=250");
  const map = {};
  for (const p of data.products || []) map[p.handle] = p.id;
  return map;
}

async function updateProducts(productMap, targetProduct) {
  console.log("\n── Products ──────────────────────────────────────────────");
  for (const prod of PRODUCTS) {
    if (targetProduct && prod.handle !== targetProduct) continue;
    const id = productMap[prod.handle];
    if (!id) {
      console.log(`  [SKIP] ${prod.handle} — not found in store`);
      continue;
    }
    await upsertMetafield(`/products/${id}`, "global", "description_tag", prod.descriptionTag);
    console.log(`  ✓ ${prod.handle}`);
  }
}

async function createRedirects() {
  console.log("\n── URL Redirects ─────────────────────────────────────────");
  // Fetch existing redirects to avoid duplicates
  const existing = await apiGet("/redirects.json?limit=250");
  const existingPaths = new Set((existing.redirects || []).map((r) => r.path));

  for (const redirect of REDIRECTS) {
    if (existingPaths.has(redirect.path)) {
      console.log(`  [EXISTS] ${redirect.path} → ${redirect.target}`);
      continue;
    }
    await apiPost("/redirects.json", { redirect });
    console.log(`  ✓ ${redirect.path} → ${redirect.target}`);
  }
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nRoman Skin SEO Update`);
  console.log(`Store: ${STORE}`);
  if (DRY_RUN) console.log("Mode: dry run (no writes)");

  if (TARGET_PRODUCT) {
    if (!PRODUCTS.some((product) => product.handle === TARGET_PRODUCT)) {
      throw new Error(`No SEO entry found for product: ${TARGET_PRODUCT}`);
    }
    const productMap = await buildProductMap();
    await updateProducts(productMap, TARGET_PRODUCT);
    console.log("\n✓ Product SEO validation complete; no other resources were touched.\n");
    return;
  }

  // Homepage SEO
  await updateHomepageSEO();

  // Collections
  const collectionMap = await buildCollectionMap();
  await updateCollections(collectionMap);

  // Products
  const productMap = await buildProductMap();
  await updateProducts(productMap);

  // Redirects
  await createRedirects();

  console.log("\n✓ Done. Push theme changes separately:\n");
  console.log(
    "  shopify theme push --store roman-skin.myshopify.com --theme 176499196186 --only layout/theme.liquid sections/footer.liquid --allow-live\n"
  );
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
