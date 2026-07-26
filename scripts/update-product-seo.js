/**
 * update-product-seo.js
 *
 * Sets keyword-rich SEO titles and meta descriptions on products that map
 * to the ryze.ai target queries:
 *
 *   "peptide serum for wrinkles"   (880 searches/mo — Amazon ranks #1)
 *   "hyaluronic acid moisturizer"  (3,900 searches/mo — Amazon ranks #1)
 *   "vitamin C serum face"         (200 searches/mo — NYT ranks #1)
 *
 * Uses Shopify metafields: global.title_tag and global.description_tag
 * These override the product admin title/description in <title> and <meta description>.
 *
 * Usage:
 *   node scripts/update-product-seo.js          # live run
 *   node scripts/update-product-seo.js --dry-run # preview only
 */
const { client } = require("./shopify");

const DRY_RUN = process.argv.includes("--dry-run");

// Maps product ID → desired SEO fields.
// Derived from product catalog fetch on 2026-07-26.
const SEO_TARGETS = [
  {
    id: 10236341289242,
    title: "Glass Glow Peptide Serum for Fine Lines",
    seoTitle: "Peptide Serum for Wrinkles & Fine Lines | Roman Skin Care",
    seoDescription:
      "Clinical-grade peptide serum for wrinkles and fine lines. Formulated by a CIDESCO-certified esthetician for visible, lasting results.",
    keyword: "peptide serum for wrinkles",
  },
  {
    id: 10156282741018,
    title: "Revitalizing Peptide Serum with Hyaluronic Acid",
    seoTitle: "Peptide Serum for Fine Lines & Wrinkles | Roman Skin Care",
    seoDescription:
      "Peptide serum for fine lines and wrinkles with hyaluronic acid for deep hydration. Clinical-grade skincare by a CIDESCO-certified esthetician.",
    keyword: "peptide serum for wrinkles",
  },
  {
    id: 10146095792410,
    title: "Multi-Peptide Anti-Aging Moisturizer with Hyaluronic Acid",
    seoTitle: "Hyaluronic Acid Moisturizer — Anti-Aging | Roman Skin Care",
    seoDescription:
      "Hyaluronic acid moisturizer with multi-peptide complex for firming and lasting hydration. Clinical anti-aging skincare by a CIDESCO-certified esthetician.",
    keyword: "hyaluronic acid moisturizer",
  },
  {
    id: 10134049128730,
    title: "Hydrating Hyaluronic Acid Serum with Vitamin E",
    seoTitle: "Hydrating Hyaluronic Acid Serum | Roman Skin Care",
    seoDescription:
      "Deep-hydrating hyaluronic acid serum with Vitamin E to replenish moisture, plump skin, and strengthen the barrier. Clinical-grade formula by Roman Skin Care.",
    keyword: "hyaluronic acid moisturizer",
  },
  {
    id: 10134049554714,
    title: "Illuminating Vitamin C Serum with Ferulic Acid",
    seoTitle: "Vitamin C Serum for Face — Ferulic Acid | Roman Skin Care",
    seoDescription:
      "Vitamin C serum for face with ferulic acid to brighten, even skin tone, and reduce hyperpigmentation. Clinical-grade formula by a CIDESCO-certified esthetician.",
    keyword: "vitamin C serum face",
  },
];

async function getExistingMetafields(productId) {
  const res = await client.get(`products/${productId}/metafields`, {
    searchParams: { namespace: "global", fields: "id,namespace,key,value" },
  });
  const data = await res.json();
  return data.metafields || [];
}

async function upsertMetafield(productId, existing, namespace, key, value) {
  const match = existing.find((m) => m.namespace === namespace && m.key === key);

  if (match) {
    // Update existing
    await client.put(`metafields/${match.id}`, {
      data: { metafield: { id: match.id, value } },
    });
    return "updated";
  } else {
    // Create new
    await client.post(`products/${productId}/metafields`, {
      data: {
        metafield: {
          namespace,
          key,
          value,
          type: "single_line_text_field",
        },
      },
    });
    return "created";
  }
}

async function run() {
  console.log(`\n🔍 update-product-seo.js ${DRY_RUN ? "[DRY RUN — no writes]" : "[LIVE]"}\n`);

  for (const target of SEO_TARGETS) {
    console.log(`\n── "${target.title}" ──────────────────────`);
    console.log(`   Keyword: "${target.keyword}"`);
    console.log(`   SEO title: "${target.seoTitle}" (${target.seoTitle.length} chars)`);
    console.log(`   SEO desc:  "${target.seoDescription}" (${target.seoDescription.length} chars)`);

    if (DRY_RUN) continue;

    const existing = await getExistingMetafields(target.id);

    const titleAction = await upsertMetafield(
      target.id, existing, "global", "title_tag", target.seoTitle
    );
    const descAction = await upsertMetafield(
      target.id, existing, "global", "description_tag", target.seoDescription
    );

    console.log(`   title_tag: ${titleAction} ✓`);
    console.log(`   description_tag: ${descAction} ✓`);
  }

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`  Products targeted: ${SEO_TARGETS.length}`);
  if (DRY_RUN) {
    console.log("  Re-run without --dry-run to apply changes.");
  } else {
    console.log("  All SEO metafields updated.");
  }
  console.log(`─────────────────────────────────────────\n`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
