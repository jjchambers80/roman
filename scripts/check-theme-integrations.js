const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const JUDGEME_EXTENSION_ID = "61ccd3b1-a9f2-4160-9fe9-4fec8413e5d8";
const JUDGEME_CORE_TYPE = `shopify://apps/judge-me-reviews/blocks/judgeme_core/${JUDGEME_EXTENSION_ID}`;
const JUDGEME_WIDGET_TYPE = `shopify://apps/judge-me-reviews/blocks/review_widget/${JUDGEME_EXTENSION_ID}`;

function readThemeJson(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  return JSON.parse(source.replace(/^\/\*[\s\S]*?\*\/\s*/, ""));
}

const settings = readThemeJson("config/settings_data.json");
const product = readThemeJson("templates/product.json");
const errors = [];
const warnings = [];
const requireJudgeMe = ["1", "true"].includes((process.env.REQUIRE_JUDGEME || "").toLowerCase());

const appEmbeds = Object.values(settings.current?.blocks || {});
const judgeMeCore = appEmbeds.find((block) => block.type === JUDGEME_CORE_TYPE);

if (!judgeMeCore) {
  const message = "Judge.me core app embed is missing from config/settings_data.json";
  (requireJudgeMe ? errors : warnings).push(message);
} else if (judgeMeCore.disabled) {
  const message = "Judge.me core app embed is disabled in config/settings_data.json";
  (requireJudgeMe ? errors : warnings).push(message);
}

const judgeMeSections = Object.entries(product.sections || {}).filter(([, section]) =>
  Object.values(section.blocks || {}).some((block) => block.type === JUDGEME_WIDGET_TYPE),
);

if (judgeMeSections.length === 0) {
  errors.push("Judge.me review widget is missing from templates/product.json");
} else {
  const orderedSections = new Set(product.order || []);
  for (const [sectionId] of judgeMeSections) {
    if (!orderedSections.has(sectionId)) {
      errors.push(`Judge.me review section ${sectionId} is missing from the product template order`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Theme integration check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

if (warnings.length > 0) console.warn(`Theme integration warnings:\n- ${warnings.join("\n- ")}`);
console.log("Theme integrations verified.");
