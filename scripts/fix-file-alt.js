/**
 * fix-file-alt.js
 *
 * Sets alt text on Shopify Files (shop_images) that render on the site
 * but have empty alt text — causing ryze.ai's "7 images missing alt text" flag.
 *
 * Uses the GraphQL Admin API (fileUpdate mutation).
 *
 * Usage:
 *   node scripts/fix-file-alt.js          # live run
 *   node scripts/fix-file-alt.js --dry-run # preview only
 */
const { graphqlClient } = require("./shopify");

const DRY_RUN = process.argv.includes("--dry-run");

// Files to fix — identified by searching for shop_images references across templates.
// Alt text describes the image for screen readers and SEO crawlers.
const FILES_TO_FIX = [
  {
    filename: "Betty_R-018_900x_jpg.webp",
    alt: "Betty Romàn, founder of Romàn Skin Care — CIDESCO-certified esthetician with 30+ years of clinical expertise",
  },
  {
    filename: "roman-commercial-poster.jpg",
    alt: "Romàn Skin Care clinical skincare — peptide serums, hyaluronic acid moisturizers, and vitamin C formulas",
  },
];

const QUERY_FILES = `
  query findFile($query: String!) {
    files(first: 5, query: $query) {
      edges {
        node {
          alt
          ... on MediaImage {
            id
            image { url }
          }
        }
      }
    }
  }
`;

const MUTATION_UPDATE = `
  mutation fileUpdate($files: [FileUpdateInput!]!) {
    fileUpdate(files: $files) {
      files {
        alt
        ... on MediaImage {
          id
          image { url }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function run() {
  console.log(`\n🔍 fix-file-alt.js ${DRY_RUN ? "[DRY RUN — no writes]" : "[LIVE]"}\n`);

  for (const file of FILES_TO_FIX) {
    console.log(`\n── "${file.filename}" ─────────────────────`);

    // Find the file by filename
    const findResult = await graphqlClient.request(QUERY_FILES, {
      variables: { query: `filename:${file.filename}` },
    });

    const edges = findResult?.data?.files?.edges || [];

    if (edges.length === 0) {
      console.log(`  WARNING: File not found — skipping`);
      continue;
    }

    const node = edges[0].node;
    const currentAlt = node.alt || "";

    console.log(`  GID        : ${node.id}`);
    console.log(`  Current alt: "${currentAlt}"`);
    console.log(`  New alt    : "${file.alt}"`);

    if (currentAlt === file.alt) {
      console.log(`  → Already correct, skipping`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  → [DRY RUN] Would update`);
      continue;
    }

    const updateResult = await graphqlClient.request(MUTATION_UPDATE, {
      variables: {
        files: [{ id: node.id, alt: file.alt }],
      },
    });

    const errors = updateResult?.data?.fileUpdate?.userErrors || [];
    if (errors.length > 0) {
      console.error(`  ERROR:`, errors);
    } else {
      const updated = updateResult?.data?.fileUpdate?.files?.[0];
      console.log(`  → Updated ✓  alt: "${updated?.alt}"`);
    }
  }

  console.log(`\n─────────────────────────────────────────\n`);
  if (DRY_RUN) console.log("Re-run without --dry-run to apply changes.\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
