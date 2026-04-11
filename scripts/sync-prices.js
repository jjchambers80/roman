require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = "2026-04";
const BASE_URL = `https://${STORE}/admin/api/${API_VERSION}`;

let HEADERS = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": TOKEN,
};

// Throttle: Shopify allows 2 req/sec on standard plan
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getProductByHandle(handle) {
  const res = await fetch(
    `${BASE_URL}/products.json?handle=${handle}&fields=id,title,variants`,
    {
      headers: HEADERS,
    },
  );
  if (!res.ok)
    throw new Error(`GET product failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.products[0] || null;
}

async function updateVariantPrice(variantId, price) {
  const res = await fetch(`${BASE_URL}/variants/${variantId}.json`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify({
      variant: { id: variantId, price: price.toFixed(2) },
    }),
  });
  if (!res.ok)
    throw new Error(`PUT variant failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!STORE || !TOKEN) {
    console.error(
      "ERROR: SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN must be set in .env",
    );
    process.exit(1);
  }

  const csvPath = path.join(
    __dirname,
    "..",
    "roman-skin-wholesale-retail-price-sheet.csv",
  );
  const raw = fs.readFileSync(csvPath, "utf8");

  // Skip the first 4 metadata rows, parse from the header row (row 5)
  const lines = raw.split("\n");
  const dataSection = lines.slice(4).join("\n"); // row 5 onwards (0-indexed: row 4)

  const records = parse(dataSection, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  const products = records.filter(
    (r) =>
      r["SKU / Handle"] &&
      !r["SKU / Handle"].startsWith(",") &&
      r["Your Retail Price"],
  );

  console.log(`\nFound ${products.length} products to sync:\n`);

  for (const row of products) {
    const handle = row["SKU / Handle"].trim();
    const retailPrice = parseFloat(
      row["Your Retail Price"].replace(/[^0-9.]/g, ""),
    );

    if (!handle || isNaN(retailPrice)) {
      console.log(`  SKIP  — invalid row: ${handle}`);
      continue;
    }

    process.stdout.write(
      `  ${row["Product Name"]} (${handle}) → $${retailPrice.toFixed(2)} ... `,
    );

    try {
      const product = await getProductByHandle(handle);
      if (!product) {
        console.log("NOT FOUND in Shopify");
        continue;
      }

      for (const variant of product.variants) {
        await updateVariantPrice(variant.id, retailPrice);
      }
      console.log("UPDATED");
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }

    await sleep(600); // ~1.6 req/sec, safely under rate limit
  }

  console.log("\nDone.\n");
}

main();
