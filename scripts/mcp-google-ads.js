#!/usr/bin/env node
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { GoogleAdsApi } = require("google-ads-api");

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

function getCustomer() {
  return client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    login_customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  });
}

const server = new Server(
  { name: "google-ads-keywords", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_keyword_ideas",
      description:
        "Get keyword ideas with search volume, competition, and CPC estimates from Google Keyword Planner. Use this for SEO research, content planning, and ad campaign keyword discovery.",
      inputSchema: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Seed keywords to generate ideas from (1–20 keywords)",
          },
          location_ids: {
            type: "array",
            items: { type: "string" },
            description:
              "Google geo target IDs. Defaults to US (2840). Common: 2840=US, 2826=UK, 2124=Canada, 2036=Australia",
          },
          language_id: {
            type: "string",
            description: "Google language criterion ID. Defaults to 1000 (English)",
          },
          page_size: {
            type: "number",
            description: "Max results to return (default 50, max 1000)",
          },
        },
        required: ["keywords"],
      },
    },
    {
      name: "get_keyword_metrics",
      description:
        "Get historical search volume metrics for a specific list of keywords (exact match). Good for validating known keywords before using them in campaigns.",
      inputSchema: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: { type: "string" },
            description: "Exact keywords to get metrics for",
          },
          location_ids: {
            type: "array",
            items: { type: "string" },
            description: "Google geo target IDs. Defaults to US (2840)",
          },
          language_id: {
            type: "string",
            description: "Google language criterion ID. Defaults to 1000 (English)",
          },
        },
        required: ["keywords"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const customer = getCustomer();

    if (name === "get_keyword_ideas") {
      const { keywords, location_ids = ["2840"], language_id = "1000", page_size = 50 } = args;

      const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        keyword_seed: { keywords },
        geo_target_constants: location_ids.map(
          (id) => `geoTargetConstants/${id}`
        ),
        language: `languageConstants/${language_id}`,
        page_size,
      });

      const results = (response.results || []).map((idea) => ({
        keyword: idea.text,
        avg_monthly_searches: idea.keyword_idea_metrics?.avg_monthly_searches ?? 0,
        competition: idea.keyword_idea_metrics?.competition ?? "UNKNOWN",
        competition_index: idea.keyword_idea_metrics?.competition_index ?? 0,
        low_top_of_page_bid_micros:
          idea.keyword_idea_metrics?.low_top_of_page_bid_micros ?? 0,
        high_top_of_page_bid_micros:
          idea.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0,
        low_cpc_usd: (
          (idea.keyword_idea_metrics?.low_top_of_page_bid_micros ?? 0) /
          1_000_000
        ).toFixed(2),
        high_cpc_usd: (
          (idea.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0) /
          1_000_000
        ).toFixed(2),
      }));

      // Sort by search volume descending
      results.sort((a, b) => b.avg_monthly_searches - a.avg_monthly_searches);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                seed_keywords: keywords,
                total_results: results.length,
                results,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "get_keyword_metrics") {
      const { keywords, location_ids = ["2840"], language_id = "1000" } = args;

      const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        keyword_seed: { keywords },
        geo_target_constants: location_ids.map(
          (id) => `geoTargetConstants/${id}`
        ),
        language: `languageConstants/${language_id}`,
        page_size: keywords.length,
      });

      // Filter to only return exact matches from the input list
      const inputSet = new Set(keywords.map((k) => k.toLowerCase()));
      const results = (response.results || [])
        .filter((idea) => inputSet.has((idea.text || "").toLowerCase()))
        .map((idea) => ({
          keyword: idea.text,
          avg_monthly_searches: idea.keyword_idea_metrics?.avg_monthly_searches ?? 0,
          competition: idea.keyword_idea_metrics?.competition ?? "UNKNOWN",
          competition_index: idea.keyword_idea_metrics?.competition_index ?? 0,
          low_cpc_usd: (
            (idea.keyword_idea_metrics?.low_top_of_page_bid_micros ?? 0) /
            1_000_000
          ).toFixed(2),
          high_cpc_usd: (
            (idea.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0) /
            1_000_000
          ).toFixed(2),
        }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ results }, null, 2),
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `Google Ads API error: ${err.message}\n${err.stack || ""}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
