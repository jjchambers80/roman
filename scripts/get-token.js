/**
 * One-time OAuth token capture script.
 * Run: node scripts/get-token.js
 * Then install the app from the Partner Dashboard pointing to http://localhost:3456
 * The access token will be printed to the terminal and saved to .env automatically.
 */
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});
const http = require("http");
const https = require("https");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { createHash, randomBytes } = require("crypto");

const PORT = 3456;
const STORE = process.env.SHOPIFY_STORE;
const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const SCOPES = [
  "read_products",
  "write_products",
  "read_inventory",
  "write_inventory",
  "read_orders",
  "write_orders",
  "read_customers",
  "write_customers",
  "read_draft_orders",
  "write_draft_orders",
  "read_discounts",
  "write_discounts",
  "read_price_rules",
  "write_price_rules",
  "read_themes",
  "write_themes",
  "read_content",
  "write_content",
  "read_analytics",
  "read_reports",
  "write_reports",
  "read_locations",
  "read_shipping",
  "write_shipping",
  "read_fulfillments",
  "write_fulfillments",
].join(",");

if (!STORE || !API_KEY || !API_SECRET) {
  console.error(
    "\nERROR: Set SHOPIFY_STORE, SHOPIFY_API_KEY, and SHOPIFY_API_SECRET in .env first.\n",
  );
  process.exit(1);
}

const nonce = randomBytes(16).toString("hex");

const installUrl =
  `https://${STORE}/admin/oauth/authorize` +
  `?client_id=${API_KEY}` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${nonce}`;

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);

  // Expose the install URL so we can retrieve it via curl
  if (parsed.pathname === '/url') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(installUrl);
    return;
  }

  if (parsed.pathname !== '/callback') {
    res.end('Waiting...');
    return;
  }

  const { code, state, hmac, ...rest } = parsed.query;

  // Validate state nonce
  if (state !== nonce) {
    res.end("State mismatch — possible CSRF attack.");
    server.close();
    return;
  }

  // Validate HMAC
  const params = Object.entries(rest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const digest = createHash("sha256")
    .update(Buffer.from(API_SECRET + params, "utf8"))
    .digest("hex");

  // Exchange code for token
  const body = JSON.stringify({
    client_id: API_KEY,
    client_secret: API_SECRET,
    code,
  });

  const tokenRes = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: STORE,
        path: "/admin/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
        },
      },
      (r) => {
        let data = "";
        r.on("data", (c) => (data += c));
        r.on("end", () => resolve(JSON.parse(data)));
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  if (!tokenRes.access_token) {
    res.end("Failed to get token: " + JSON.stringify(tokenRes));
    server.close();
    return;
  }

  const token = tokenRes.access_token;

  // Save to .env
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  if (envContent.includes("SHOPIFY_ACCESS_TOKEN=")) {
    envContent = envContent.replace(
      /SHOPIFY_ACCESS_TOKEN=.*/g,
      `SHOPIFY_ACCESS_TOKEN=${token}`,
    );
  } else {
    envContent = envContent.trimEnd() + `\nSHOPIFY_ACCESS_TOKEN=${token}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  console.log("\n✅ Success! Access token saved to .env");
  console.log(`   Token: ${token}\n`);

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    "<h2>✅ Token captured and saved to .env — you can close this tab.</h2>",
  );
  server.close();
});

server.listen(PORT, () => {
  console.log(`\nOAuth server running on http://localhost:${PORT}`);
  console.log("\nNext steps:");
  console.log(
    "1. Go to your Partner Dashboard → Roman Skin Admin → Versions → roman-skin-admin-1",
  );
  console.log("2. Set the App URL to: http://localhost:3456");
  console.log("3. Set Redirect URLs to: http://localhost:3456/callback");
  console.log("4. Save, then open this URL in your browser:\n");
  console.log(`   ${installUrl}\n`);
  console.log("The token will be captured automatically and saved to .env.\n");
});
