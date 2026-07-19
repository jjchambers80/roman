#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { graphqlClient } = require("./shopify");

const files = [
  {
    filename: "illuminating-daily-serum-with-vitamin-c-03-ingredients.png",
    alt: "Ingredient roles in Roman Skin Illuminating Vitamin C Serum",
  },
  {
    filename: "illuminating-daily-serum-with-vitamin-c-06-routine.png",
    alt: "How to layer Roman Skin Illuminating Vitamin C Serum in a morning routine",
  },
].map((file) => ({ ...file, filepath: path.join(__dirname, "..", "assets", file.filename) }));

async function uploadStaged(file) {
  const staged = await graphqlClient.request(
    `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets { url resourceUrl parameters { name value } }
          userErrors { field message }
        }
      }`,
    { variables: { input: [{ filename: file.filename, mimeType: "image/png", resource: "IMAGE", httpMethod: "POST" }] } },
  );
  const payload = staged.data.stagedUploadsCreate;
  if (payload.userErrors.length) throw new Error(JSON.stringify(payload.userErrors));
  const target = payload.stagedTargets[0];
  const form = new FormData();
  for (const parameter of target.parameters) form.append(parameter.name, parameter.value);
  form.append("file", new Blob([fs.readFileSync(file.filepath)], { type: "image/png" }), file.filename);
  const response = await fetch(target.url, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Staged upload failed for ${file.filename}: ${response.status}`);
  return target.resourceUrl;
}

async function run() {
  for (const file of files) {
    if (!fs.existsSync(file.filepath)) throw new Error(`Missing file: ${file.filepath}`);
    const originalSource = await uploadStaged(file);
    const created = await graphqlClient.request(
      `#graphql
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { id fileStatus alt }
            userErrors { field message }
          }
        }`,
      { variables: { files: [{ originalSource, contentType: "IMAGE", alt: file.alt, filename: file.filename }] } },
    );
    const payload = created.data.fileCreate;
    if (payload.userErrors.length) throw new Error(JSON.stringify(payload.userErrors));
    console.log(`${file.filename}: ${payload.files[0].id} (${payload.files[0].fileStatus})`);
  }
}

run().catch((error) => { console.error(error.message); process.exit(1); });
