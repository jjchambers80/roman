const { client } = require("./shopify");

const PRODUCT_ID = "10156282741018";

const KEEP_IDS = new Set([56078394720538, 56078394753306]);
const TARGET_FILES = new Set([
  "roman-skin-revitalizing-serum-bottle-white-background.png",
  "roman-skin-revitalizing-serum-box-white-background.png",
]);

function normalizeFilename(src) {
  const raw = (src || "").split("/").pop().split("?")[0];
  return raw.replace(/_[0-9a-f-]{36}\.png$/i, ".png");
}

async function run() {
  const listRes = await client.get(`products/${PRODUCT_ID}/images`);
  const listData = await listRes.json();
  const images = listData.images || [];

  const toDelete = images.filter((img) => {
    const normalized = normalizeFilename(img.src);
    return TARGET_FILES.has(normalized) && !KEEP_IDS.has(img.id);
  });

  if (toDelete.length === 0) {
    console.log("No duplicate serum images found to delete.");
  }

  for (const img of toDelete) {
    const delRes = await client.delete(`products/${PRODUCT_ID}/images/${img.id}`);

    if (!delRes.ok) {
      const text = await delRes.text();
      console.error(
        `FAILED ${img.id}: HTTP ${delRes.status} ${text.slice(0, 250)}`,
      );
    } else {
      console.log(`DELETED ${img.id}`);
    }
  }

  const verifyRes = await client.get(`products/${PRODUCT_ID}/images`);
  const verifyData = await verifyRes.json();

  console.log("Remaining top images:");
  (verifyData.images || []).slice(0, 6).forEach((img) => {
    console.log(`${img.position}: ${img.id} :: ${img.src}`);
  });
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
