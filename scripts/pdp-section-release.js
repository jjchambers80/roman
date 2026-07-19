#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const THEME_DIRECTORIES = new Set([
  "assets",
  "config",
  "layout",
  "locales",
  "sections",
  "snippets",
  "templates",
]);

function fail(message) {
  console.error(`PDP release error: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...options.env },
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) fail(result.error.message);
  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) process.stdout.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
    }
    if (options.failureHint) console.error(`\n${options.failureHint}`);
    fail(`${command} exited with status ${result.status}`);
  }

  return options.capture ? result.stdout.trim() : "";
}

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) fail(`${name} requires a value`);
  return value;
}

function relativeFile(file) {
  const absolute = path.resolve(ROOT, file);
  const relative = path.relative(ROOT, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`file must be inside the repository: ${file}`);
  }
  return relative.split(path.sep).join("/");
}

function loadManifest() {
  const requested = option("--manifest");
  if (!requested) fail("pass --manifest releases/pdp/<release>.json");

  const manifestFile = relativeFile(requested);
  if (!manifestFile.startsWith("releases/pdp/") || !manifestFile.endsWith(".json")) {
    fail("manifest must be a JSON file under releases/pdp/");
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestFile), "utf8"));
  } catch (error) {
    fail(`cannot read manifest ${manifestFile}: ${error.message}`);
  }

  for (const field of ["id", "section", "scope", "commit_message"]) {
    if (typeof manifest[field] !== "string" || !manifest[field].trim()) {
      fail(`manifest field ${field} must be a non-empty string`);
    }
  }
  if (!["all-pdps", "product-exception"].includes(manifest.scope)) {
    fail('manifest scope must be "all-pdps" or "product-exception"');
  }
  if (!Array.isArray(manifest.acceptance_criteria) || manifest.acceptance_criteria.length === 0) {
    fail("manifest acceptance_criteria must be a non-empty array");
  }
  if (manifest.acceptance_criteria.some((criterion) => typeof criterion !== "string" || !criterion.trim())) {
    fail("every acceptance criterion must be a non-empty string");
  }
  if (manifest.scope === "product-exception" &&
      (typeof manifest.exception_reason !== "string" || !manifest.exception_reason.trim())) {
    fail("product-exception releases require exception_reason");
  }
  if (!Array.isArray(manifest.theme_files) || manifest.theme_files.length === 0) {
    fail("manifest theme_files must be a non-empty array");
  }

  const themeFiles = manifest.theme_files.map(relativeFile);
  if (new Set(themeFiles).size !== themeFiles.length) fail("manifest contains duplicate theme files");

  for (const file of themeFiles) {
    const topLevel = file.split("/")[0];
    if (!THEME_DIRECTORIES.has(topLevel)) fail(`not a Shopify theme file: ${file}`);
    if (!fs.existsSync(path.join(ROOT, file))) fail(`listed theme file does not exist: ${file}`);
    if (manifest.scope === "all-pdps" && /^templates\/product\..+\.json$/.test(file)) {
      fail(`shared PDP releases cannot include alternate product templates: ${file}`);
    }
  }

  return { manifest, manifestFile, themeFiles };
}

function changedReleaseFiles(files) {
  const output = run("git", ["status", "--short", "--", ...files], { capture: true });
  if (!output) fail("the manifest and theme files contain no changes to release");
  console.log("\nRelease file status:\n" + output);
}

function validateJson(files) {
  for (const file of files.filter((entry) => entry.endsWith(".json"))) {
    try {
      const contents = fs.readFileSync(path.join(ROOT, file), "utf8");
      const shopifyJson = contents.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");
      JSON.parse(shopifyJson);
    } catch (error) {
      fail(`invalid JSON in ${file}: ${error.message}`);
    }
  }
}

function validate(release, production = false) {
  const releaseFiles = [release.manifestFile, ...release.themeFiles];
  const themeStatus = run("git", ["status", "--short", "--", ...release.themeFiles], { capture: true });
  if (!themeStatus) fail("none of the listed theme files has a change to release");
  changedReleaseFiles(releaseFiles);
  validateJson(releaseFiles);
  run("git", ["diff", "--check", "--", ...releaseFiles]);

  const integrationCheck = path.join(ROOT, "scripts/check-theme-integrations.js");
  if (fs.existsSync(integrationCheck)) {
    run("node", ["scripts/check-theme-integrations.js"], {
      env: production ? { REQUIRE_JUDGEME: "1" } : {},
    });
  }
  run("shopify", ["theme", "check"]);
}

function pushArgs(files) {
  return files.flatMap((file) => ["--only", file]);
}

function fileDigest(files) {
  const digest = crypto.createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    digest.update(fs.readFileSync(path.join(ROOT, file)));
    digest.update("\0");
  }
  return digest.digest("hex");
}

function preview(release) {
  const theme = option("--theme");
  if (!theme) fail("preview requires --theme <unpublished-development-theme-id>");
  validate(release, false);
  run("shopify", ["theme", "push", "--theme", theme, "--nodelete", "--strict", ...pushArgs(release.themeFiles)]);
  console.log(`\nDevelopment push complete. Tested-file digest: ${fileDigest(release.themeFiles)}`);
  console.log("After testing, record this digest and the approval details in the manifest before production release.");
}

function release(releaseUnit) {
  if (!process.argv.includes("--confirm-production")) {
    fail("production release requires --confirm-production after development approval");
  }

  const approval = releaseUnit.manifest.development_approval;
  for (const field of ["theme_id", "preview_url", "approved_by", "approved_at", "file_digest"]) {
    if (!approval || typeof approval[field] !== "string" || !approval[field].trim()) {
      fail(`production release requires development_approval.${field} in the manifest`);
    }
  }
  const currentDigest = fileDigest(releaseUnit.themeFiles);
  if (approval.file_digest !== currentDigest) {
    fail("theme files changed after development approval; push and test the updated files again");
  }
  if (releaseUnit.manifest.production_release) {
    fail("this manifest already contains a production_release record");
  }

  const releaseFiles = [releaseUnit.manifestFile, ...releaseUnit.themeFiles];
  run("git", ["config", "user.name"], { capture: true });
  run("git", ["config", "user.email"], { capture: true });
  validate(releaseUnit, true);
  run("shopify", ["theme", "push", "--live", "--allow-live", "--nodelete", "--strict", ...pushArgs(releaseUnit.themeFiles)]);

  releaseUnit.manifest.production_release = {
    released_at: new Date().toISOString(),
    target: "live",
    file_digest: currentDigest,
  };
  fs.writeFileSync(
    path.join(ROOT, releaseUnit.manifestFile),
    `${JSON.stringify(releaseUnit.manifest, null, 2)}\n`,
  );

  const recovery = [
    "The production push succeeded, but the Git recording step failed.",
    "Stop before another release and recover with:",
    `git add -- ${releaseFiles.join(" ")}`,
    `git commit --only -m ${JSON.stringify(releaseUnit.manifest.commit_message)} -- ${releaseFiles.join(" ")}`,
  ].join("\n");
  run("git", ["add", "--", ...releaseFiles], { failureHint: recovery });
  run("git", ["commit", "--only", "-m", releaseUnit.manifest.commit_message, "--", ...releaseFiles], {
    failureHint: recovery,
  });

  const sha = run("git", ["rev-parse", "--short", "HEAD"], { capture: true });
  const committed = run("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], { capture: true })
    .split("\n")
    .filter(Boolean);
  const unexpected = committed.filter((file) => !releaseFiles.includes(file));
  if (unexpected.length) fail(`automatic commit contains unexpected files: ${unexpected.join(", ")}`);
  console.log(`\nProduction release committed as ${sha}.`);
}

const command = process.argv[2];
if (!["check", "preview", "release"].includes(command)) {
  fail("usage: pdp-section-release.js <check|preview|release> --manifest <path> [--theme <id>] [--confirm-production]");
}

const releaseUnit = loadManifest();
console.log(`PDP release: ${releaseUnit.manifest.section} (${releaseUnit.manifest.scope})`);

if (command === "check") validate(releaseUnit, false);
if (command === "preview") preview(releaseUnit);
if (command === "release") release(releaseUnit);
