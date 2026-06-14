/**
 * update-product-titles.js
 * Applies keyword-rich title updates to all active products.
 * Usage: node scripts/update-product-titles.js
 */
const { client } = require("./shopify");

const updates = [
  {
    id: 10134049751322,
    old: "Balancing Skin Cleanser for All Skin Types",
    title: "Balancing Foaming Cleanser with Green Tea & Rooibos",
  },
  {
    id: 10134048833818,
    old: "Gentle Cleansing Milk",
    title: "Gentle Cleansing Milk with Shea Butter for Sensitive Skin",
  },
  {
    id: 10134048964890,
    old: "Gentle Toner",
    title: "Gentle Botanical Toner for Sensitive Skin",
  },
  {
    id: 10134049358106,
    old: "HA Peptide Eye Creme",
    title: "Hyaluronic Acid Peptide Eye Creme - Anti-Aging",
  },
  {
    id: 10134049128730,
    old: "Hyaluronic Serum with Vitamin E",
    title: "Hydrating Hyaluronic Acid Serum with Vitamin E",
  },
  {
    id: 10134049554714,
    old: "Illuminating Daily Serum with Vitamin C",
    title: "Illuminating Vitamin C Serum with Ferulic Acid",
  },
  {
    id: 10146095792410,
    old: "Multi-Peptide Moisture Creme",
    title: "Multi-Peptide Anti-Aging Moisturizer with Hyaluronic Acid",
  },
  {
    id: 10134150742298,
    old: "Pomegranate Eye Patches",
    title: "Pomegranate & Resveratrol Anti-Aging Eye Patches",
  },
  {
    id: 10134126919962,
    old: "Rejuvenating Serum with Ferulic Acid",
    title: "Rejuvenating Vitamin C & Ferulic Acid Serum",
  },
  {
    id: 10156282741018,
    old: "Revitalizing Serum with Botanical Growth Factor",
    title: "Revitalizing Peptide Serum with Hyaluronic Acid",
  },
];

async function run() {
  console.log(`Updating ${updates.length} product titles...\n`);
  let ok = 0;
  let fail = 0;

  for (const u of updates) {
    const res = await client.put(`products/${u.id}`, { data: { product: { id: u.id, title: u.title } } });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅  "${u.old}"\n    → "${data.product.title}"\n`);
      ok++;
    } else {
      console.error(`❌  "${u.old}"\n    Error: ${JSON.stringify(data)}\n`);
      fail++;
    }
  }

  console.log(`\nDone. ${ok} updated, ${fail} failed.`);
}

run().catch(console.error);
