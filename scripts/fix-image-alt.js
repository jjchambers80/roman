/**
 * fix-image-alt.js
 *
 * Bulk-fix empty alt text on all product images in Shopify.
 * The theme code is correct (it reads alt from media), but the alt values
 * are empty in the admin — this script fills them in via the REST API.
 *
 * Alt text formula:
 *   position 1 : "{Product Title} — {Product Type} | Roman Skin Care"
 *   position 2+: "{Product Title} — view {position} | Roman Skin Care"
 *
 * Usage:
 *   node scripts/fix-image-alt.js          # live run
 *   node scripts/fix-image-alt.js --dry-run # preview only, no writes
 */
const { client } = require("./shopify");

const DRY_RUN = process.argv.includes("--dry-run");

async function fetchAllProducts() {
  const products = [];
  let pageInfo = null;
  const limit = 250;

  do {
    const params = { limit, fields: "id,title,product_type,images" };
    if (pageInfo) params.page_info = pageInfo;

    const res = await client.get("products", { searchParams: params });
    const data = await res.json();
    products.push(...(data.products || []));

    // Extract next page cursor from Link header
    const linkHeader = res.headers?.get?.("link") || "";
    const nextMatch = linkHeader.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    pageInfo = nextMatch ? nextMatch[1] : null;
  } while (pageInfo);

  return products;
}

function buildAltText(product, image) {
  const type = product.product_type?.trim();
  if (image.position === 1) {
    if (type) {
      return `${product.title} — ${type} | Roman Skin Care`;
    }
    return `${product.title} | Roman Skin Care`;
  }
  return `${product.title} — view ${image.position} | Roman Skin Care`;
}

async function run() {
  console.log(`\n🔍 fix-image-alt.js ${DRY_RUN ? "[DRY RUN — no writes]" : "[LIVE]"}\n`);

  const products = await fetchAllProducts();
  console.log(`Fetched ${products.length} products.\n`);

  let totalImages = 0;
  let missingAlt = 0;
  let updated = 0;
  let errors = 0;

  for (const product of products) {
    const images = product.images || [];
    for (const image of images) {
      totalImages++;
      const currentAlt = (image.alt || "").trim();

      if (currentAlt !== "") continue; // already has alt text

      missingAlt++;
      const newAlt = buildAltText(product, image);

      console.log(
        `  [${DRY_RUN ? "DRY" : "FIX"}] Product: "${product.title}" | Image #${image.position} (id: ${image.id})` +
          `\n        alt: "" → "${newAlt}"`
      );

      if (!DRY_RUN) {
        try {
          await client.put(`products/${product.id}/images/${image.id}`, {
            data: { image: { id: image.id, alt: newAlt } },
          });
          updated++;
        } catch (err) {
          console.error(`  ERROR updating image ${image.id}:`, err.message);
          errors++;
        }
      }
    }
  }

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Total images scanned : ${totalImages}`);
  console.log(`  Missing alt text     : ${missingAlt}`);
  if (!DRY_RUN) {
    console.log(`  Updated              : ${updated}`);
    console.log(`  Errors               : ${errors}`);
  }
  console.log(`─────────────────────────────────────────\n`);
  if (DRY_RUN) {
    console.log("Re-run without --dry-run to apply changes.\n");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
