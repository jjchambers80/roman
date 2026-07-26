/**
 * fix-product-image-alt.js
 *
 * Audits all product images and sets alt text on any that are missing it.
 * Alt text format: "<Product Title> - <variant/position description>"
 *
 * Usage:
 *   node scripts/fix-product-image-alt.js          # dry run (shows what would change)
 *   node scripts/fix-product-image-alt.js --write   # apply changes
 */

const { client } = require("./shopify");

const DRY_RUN = !process.argv.includes("--write");

if (DRY_RUN) {
  console.log("DRY RUN — pass --write to apply changes\n");
}

async function getAllProducts() {
  const products = [];
  let pageInfo = null;

  do {
    const params = {
      limit: 250,
      fields: "id,title,images",
    };
    if (pageInfo) params.page_info = pageInfo;

    const res = await client.get("products", { searchParams: params });
    const body = await res.json();
    products.push(...body.products);

    // Parse Link header for cursor-based pagination
    const link = res.headers.get("link") || "";
    const nextMatch = link.match(/<[^>]+page_info=([^&>]+)[^>]*>;\s*rel="next"/);
    pageInfo = nextMatch ? nextMatch[1] : null;
  } while (pageInfo);

  return products;
}

async function fixProductImages(product) {
  const missing = product.images.filter(
    (img) => !img.alt || img.alt.trim() === ""
  );

  if (missing.length === 0) return;

  for (const img of missing) {
    const position = img.position || product.images.indexOf(img) + 1;
    const altText =
      position === 1
        ? product.title
        : `${product.title} - image ${position}`;

    console.log(
      `  [${DRY_RUN ? "DRY" : "FIX"}] product "${product.title}" image #${position}: set alt → "${altText}"`
    );

    if (!DRY_RUN) {
      await client.put(`products/${product.id}/images/${img.id}`, {
        data: { image: { id: img.id, alt: altText } },
      });
    }
  }
}

async function main() {
  console.log("Fetching all products...");
  const products = await getAllProducts();
  console.log(`Found ${products.length} products\n`);

  let totalMissing = 0;
  let totalFixed = 0;

  for (const product of products) {
    const missing = product.images.filter(
      (img) => !img.alt || img.alt.trim() === ""
    );
    if (missing.length === 0) continue;

    totalMissing += missing.length;
    console.log(
      `"${product.title}" — ${missing.length} image(s) missing alt text`
    );
    await fixProductImages(product);
    if (!DRY_RUN) totalFixed += missing.length;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Images missing alt text: ${totalMissing}`);
  if (DRY_RUN) {
    console.log(`Run with --write to apply fixes`);
  } else {
    console.log(`Images updated: ${totalFixed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
