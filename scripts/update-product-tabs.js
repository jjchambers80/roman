/**
 * update-product-tabs.js
 * Reads the SEO product markdown and upserts per-product tab content as
 * metafields (custom.tab_description / custom.tab_usage / custom.tab_ingredients).
 *
 * Usage: node scripts/update-product-tabs.js
 */
const { client } = require("./shopify");
const fs = require("fs");
const path = require("path");

const SEO_MD = path.join(
  __dirname,
  "..",
  "brain",
  "roman",
  "seo",
  "roman-skin-body-care-product-info-seo.md",
);

// Map all-caps markdown titles → Shopify product IDs
const PRODUCT_MAP = {
  "BALANCING FOAMING CLEANSER WITH GREEN TEA & ROOIBOS": 10134049751322,
  "GENTLE BOTANICAL TONER FOR SENSITIVE SKIN": 10134048964890,
  "HYALURONIC ACID PEPTIDE EYE CREME - ANTI-AGING": 10134049358106,
  "ILLUMINATING VITAMIN C SERUM WITH FERULIC ACID": 10134049554714,
  "REJUVENATING VITAMIN C & FERULIC ACID SERUM": 10134126919962,
  "HYDRATING HYALURONIC ACID SERUM WITH VITAMIN E": 10134049128730,
  "REVITALIZING PEPTIDE SERUM WITH HYALURONIC ACID": 10156282741018,
  "GENTLE CLEANSING MILK WITH SHEA BUTTER FOR SENSITIVE SKIN": 10134048833818,
};

// Collapse multi-line text into a single trimmed paragraph.
const joinAll = (s) =>
  s.trim().replace(/\n+/g, " ").replace(/\s+/g, " ").trim();

// Preserve intentional paragraph breaks (e.g. safety warnings in usage sections).
const cleanParagraphs = (s) =>
  s
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const products = [];

  // Split on all-caps product title lines (preceded by a blank line or start of file).
  const blocks = content.split(/\n(?=[A-Z][A-Z0-9 &\-]+\n)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const firstNewline = trimmed.indexOf("\n");
    if (firstNewline === -1) continue;

    const title = trimmed.substring(0, firstNewline).trim();

    // Must be an all-caps title (only uppercase letters, digits, spaces, & -)
    if (!/^[A-Z][A-Z0-9 &\-]+$/.test(title)) continue;

    const body = trimmed.substring(firstNewline).trim();

    const descMatch = body.match(
      /Product Description:\s*([\s\S]+?)(?=\n\n\s*Client Use:)/,
    );
    const useMatch = body.match(
      /Client Use:\s*([\s\S]+?)(?=\n\n\s*Product Ingredients:)/,
    );
    const ingMatch = body.match(/Product Ingredients:\s*([\s\S]+?)(?:\s*)$/);

    if (!descMatch || !useMatch || !ingMatch) {
      console.warn(`⚠️  Skipping (parse error): ${title}`);
      continue;
    }

    products.push({
      title,
      description: joinAll(descMatch[1]),
      usage: cleanParagraphs(useMatch[1]),
      ingredients: joinAll(ingMatch[1]),
    });
  }

  return products;
}

async function getExistingMetafield(productId, namespace, key) {
  const res = await client.get(`products/${productId}/metafields`, {
    searchParams: { namespace, key },
  });
  const data = await res.json();
  return data.metafields?.[0] ?? null;
}

async function upsertMetafield(productId, namespace, key, value) {
  const existing = await getExistingMetafield(productId, namespace, key);

  if (existing) {
    const res = await client.put(`metafields/${existing.id}`, {
      data: { metafield: { id: existing.id, value } },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return "updated";
  } else {
    const res = await client.post(`products/${productId}/metafields`, {
      data: { metafield: { namespace, key, value, type: "multi_line_text_field" } },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return "created";
  }
}

async function run() {
  console.log("Parsing SEO markdown…\n");
  const products = parseMarkdown(SEO_MD);
  console.log(`Found ${products.length} products in markdown.\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const p of products) {
    const productId = PRODUCT_MAP[p.title];

    if (!productId) {
      console.log(`⏭  No ID mapping for: ${p.title}`);
      skip++;
      continue;
    }

    console.log(`→ ${p.title} (${productId})`);

    const fields = [
      { key: "tab_description", value: p.description },
      { key: "tab_usage", value: p.usage },
      { key: "tab_ingredients", value: p.ingredients },
    ];

    let productOk = true;
    for (const f of fields) {
      try {
        const action = await upsertMetafield(
          productId,
          "custom",
          f.key,
          f.value,
        );
        console.log(`   ✅ ${f.key} (${action})`);
      } catch (err) {
        console.error(`   ❌ ${f.key} — ${err.message}`);
        productOk = false;
      }
    }

    if (productOk) ok++;
    else fail++;
    console.log("");
  }

  console.log("─────────────────────────────────");
  console.log(
    `Done. ✅ ${ok} products updated · ⏭ ${skip} skipped · ❌ ${fail} failed`,
  );
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
