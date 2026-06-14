#!/usr/bin/env node
const { client } = require("./shopify");

const fs = require("fs");
const path = require("path");

const PRODUCT_ID = "10156282741018";
const IMAGE_PATHS = [
  path.join(
    __dirname,
    "..",
    "assets",
    "roman-skin-revitalizing-serum-bottle-white-background.png",
  ),
  path.join(
    __dirname,
    "..",
    "assets",
    "roman-skin-revitalizing-serum-box-white-background.png",
  ),
];

async function uploadImage(filePath, position) {
  const attachment = fs.readFileSync(filePath).toString("base64");
  const filename = path.basename(filePath);

  const res = await client.post(`products/${PRODUCT_ID}/images`, {
    data: {
      image: {
        attachment,
        filename,
        position,
        alt: "Revitalizing Peptide Serum with Hyaluronic Acid",
      },
    },
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // leave data as empty object
  }

  if (!res.ok) {
    throw new Error(
      `Upload failed for ${filename}: HTTP ${res.status} ${text.slice(0, 500)}`,
    );
  }

  return data.image;
}

async function run() {
  console.log(`Updating images for product ${PRODUCT_ID}...`);

  for (let i = 0; i < IMAGE_PATHS.length; i += 1) {
    const imagePath = IMAGE_PATHS[i];
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }
    const image = await uploadImage(imagePath, i + 1);
    console.log(
      `Uploaded: ${path.basename(imagePath)} -> image id ${image.id}, position ${image.position}`,
    );
  }

  const listRes = await client.get(`products/${PRODUCT_ID}/images`);
  const listData = await listRes.json();
  const top = (listData.images || [])
    .slice(0, 5)
    .map((img) => `${img.position}: ${img.src}`);

  console.log("Top product images now:");
  top.forEach((line) => console.log(`- ${line}`));
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
