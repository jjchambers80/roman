/**
 * setup-articles.js
 * Creates the 4 category blogs and the Articles landing page via Shopify Admin REST API.
 * Usage: node scripts/setup-articles.js
 *
 * Safe to re-run — checks for existing blogs/page before creating.
 */
const { client, STORE } = require("./shopify");

const BLOGS = [
  { title: "Skin Tips",   handle: "skin-tips"   },
  { title: "Ingredients", handle: "ingredients"  },
  { title: "Anti-Aging",  handle: "anti-aging"   },
  { title: "Routines",    handle: "routines"     },
];

const ARTICLES_PAGE = {
  title: "Articles",
  handle: "articles",
  body_html: "<p>Expert skin care advice from Betty Román, CIDESCO-certified esthetician.</p>",
  template_suffix: "articles",
  published: true,
};

async function fetchJSON(path, method, data) {
  let res;
  if (!method || method === "GET") {
    res = await client.get(path);
  } else if (method === "POST") {
    res = await client.post(path, { data });
  } else if (method === "PUT") {
    res = await client.put(path, { data });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function getExistingBlogs() {
  const data = await fetchJSON("blogs");
  return data.blogs;
}

async function createBlog(blog) {
  const data = await fetchJSON("blogs", "POST", { blog });
  return data.blog;
}

async function getExistingPages() {
  const data = await fetchJSON("pages");
  return data.pages;
}

async function createPage(page) {
  const data = await fetchJSON("pages", "POST", { page });
  return data.page;
}

async function main() {
  console.log(`\n🛍  Shopify Articles Setup — ${STORE}\n${"─".repeat(50)}`);

  // ── Blogs ──────────────────────────────────────────────
  console.log("\n📚 Setting up category blogs…");
  const existingBlogs = await getExistingBlogs();
  const existingHandles = existingBlogs.map((b) => b.handle);

  for (const blog of BLOGS) {
    if (existingHandles.includes(blog.handle)) {
      console.log(`  ✓ Already exists: ${blog.title} (/blogs/${blog.handle})`);
    } else {
      const created = await createBlog({ title: blog.title, handle: blog.handle });
      console.log(`  + Created: ${created.title} → /blogs/${created.handle} (id: ${created.id})`);
    }
  }

  // ── Articles page ──────────────────────────────────────
  console.log("\n📄 Setting up Articles landing page…");
  const existingPages = await getExistingPages();
  const existingPage = existingPages.find((p) => p.handle === "articles");

  if (existingPage) {
    console.log(`  ✓ Already exists: /pages/articles (id: ${existingPage.id})`);
    // Ensure the template suffix is correct
    if (existingPage.template_suffix !== "articles") {
      const updated = await fetchJSON(`pages/${existingPage.id}`, "PUT", { page: { template_suffix: "articles" } });
      console.log(`  ↻ Updated template_suffix → ${updated.page.template_suffix}`);
    }
  } else {
    const created = await createPage(ARTICLES_PAGE);
    console.log(`  + Created: /pages/${created.handle} (id: ${created.id})`);
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log("✅ Done.\n");
  console.log("Next steps:");
  console.log("  1. Push theme changes: shopify theme push");
  console.log("  2. Add 'Articles' → /pages/articles to Main Menu in Shopify Admin");
  console.log("     Admin → Online Store → Navigation → Main Menu → Add menu item");
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
