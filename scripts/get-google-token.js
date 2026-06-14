#!/usr/bin/env node
/**
 * One-time script to generate a Google Ads API refresh token.
 * Run: node scripts/get-google-token.js
 * It will open a browser, you authorize, and the refresh token is saved to .env automatically.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");
const { exec } = require("child_process");
const url = require("url");
const fs = require("fs");
const path = require("path");

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const PORT = 3457;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/adwords",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\nERROR: GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET must be set in .env\n");
  process.exit(1);
}

const authUrl =
  `https://accounts.google.com/o/oauth2/v2/auth` +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log("\nOpening browser for Google authorization...");
console.log("If the browser doesn't open, visit this URL manually:\n");
console.log(authUrl + "\n");

// Open browser
exec(`open "${authUrl}"`);

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== "/callback") {
    res.end("Not found");
    return;
  }

  const code = parsed.query.code;
  if (!code) {
    res.end("Error: no code returned");
    server.close();
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    console.error("\nToken exchange failed:", tokens.error, tokens.error_description);
    res.end("Error: " + tokens.error);
    server.close();
    return;
  }

  const refreshToken = tokens.refresh_token;
  console.log("\nRefresh token obtained successfully.");

  // Save to .env
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");

  if (envContent.includes("GOOGLE_ADS_REFRESH_TOKEN=")) {
    envContent = envContent.replace(
      /GOOGLE_ADS_REFRESH_TOKEN=.*/,
      `GOOGLE_ADS_REFRESH_TOKEN=${refreshToken}`
    );
  } else {
    envContent += `\nGOOGLE_ADS_REFRESH_TOKEN=${refreshToken}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log("Saved to .env: GOOGLE_ADS_REFRESH_TOKEN\n");
  console.log("Setup complete! You can now use the Google Ads MCP server.\n");

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2>Authorization successful!</h2><p>You can close this tab and return to the terminal.</p>");
  server.close();
});

server.listen(PORT, () => {
  console.log(`Waiting for authorization on http://localhost:${PORT}/callback ...`);
});
