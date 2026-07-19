const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT = path.resolve(__dirname, "..");
const sourceIndex = process.argv.indexOf("--source");
const sourcePath = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : null;

if (!sourcePath) {
  console.error("Usage: node scripts/prepare-judgeme-review-archive.js --source <judge-me-export.csv>");
  process.exit(1);
}

const reviewsRoot = path.join(ROOT, "brain", "roman", "reviews");
const privateDir = path.join(reviewsRoot, "private");
const exportsDir = path.join(reviewsRoot, "exports");
const archiveName = "judgeme-published-reviews-2026-07-19-source.csv";
const canonicalName = "judgeme-published-reviews-2026-07-19-canonical.csv";

function readCsv(filePath) {
  return parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  const lines = [columns.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const sourceBuffer = fs.readFileSync(sourcePath);
const officialRows = readCsv(sourcePath);
fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
fs.mkdirSync(exportsDir, { recursive: true });

const publicColumns = [
  "title",
  "body",
  "rating",
  "review_date",
  "source",
  "curated",
  "reviewer_name",
  "product_id",
  "product_handle",
  "reply",
  "reply_date",
  "picture_urls",
  "location",
  "metaobject_handle",
];

const archivedPath = path.join(privateDir, archiveName);
const canonicalPath = path.join(exportsDir, canonicalName);
fs.writeFileSync(archivedPath, sourceBuffer, { mode: 0o600 });
fs.chmodSync(archivedPath, 0o600);
fs.writeFileSync(canonicalPath, toCsv(officialRows, publicColumns));

const canonicalByProduct = Object.fromEntries(
  Object.entries(Object.groupBy(officialRows, (row) => row.product_handle || "shop_review"))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([handle, rows]) => [handle, rows.length]),
);

const report = {
  prepared_at: "2026-07-19",
  source_filename: path.basename(sourcePath),
  source_sha256: sha256(sourceBuffer),
  official_export_rows: officialRows.length,
  approval: "User confirmed on 2026-07-19 that the export is authoritative as-is and all included reviews are retained.",
  canonical_rows: officialRows.length,
  canonical_rows_by_product: canonicalByProduct,
  canonical_sha256: sha256(fs.readFileSync(canonicalPath)),
  pii_policy: "The exact source export is private and mode 0600. The canonical CSV excludes reviewer email and IP address.",
};

fs.writeFileSync(
  path.join(exportsDir, "judgeme-published-reviews-2026-07-19-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify(report, null, 2));
