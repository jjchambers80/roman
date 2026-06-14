#!/usr/bin/env node
// Fix incorrect product URLs in live blog article body_html

const { client } = require("./shopify");

const FIXES = [
  {
    blogHandle: "skin-tips",
    articleHandle: "best-foaming-cleanser-for-oily-skin",
    from: "/products/balancing-foaming-cleanser",
    to: "/products/balancing-skin-cleanser-for-all-skin-types",
  },
  {
    blogHandle: "ingredients",
    articleHandle: "does-vitamin-c-serum-reduce-wrinkles",
    from: "/products/illuminating-vitamin-c-serum-with-ferulic-acid",
    to: "/products/rejuvenating-serum-with-ferulic-acid",
  },
  {
    blogHandle: "ingredients",
    articleHandle: "how-to-fade-dark-spots-with-vitamin-c-serum",
    from: "/products/illuminating-vitamin-c-serum-with-ferulic-acid",
    to: "/products/rejuvenating-serum-with-ferulic-acid",
  },
];

async function getBlogId(handle) {
  const res = await client.get("blogs");
  const { blogs } = await res.json();
  const blog = blogs.find((b) => b.handle === handle);
  if (!blog) throw new Error(`Blog not found: ${handle}`);
  return blog.id;
}

async function getArticle(blogId, handle) {
  const res = await client.get(`blogs/${blogId}/articles`, { searchParams: { handle } });
  const { articles } = await res.json();
  const article = articles.find((a) => a.handle === handle);
  if (!article) throw new Error(`Article not found: ${handle}`);
  return article;
}

async function updateArticle(blogId, articleId, body_html) {
  const res = await client.put(`blogs/${blogId}/articles/${articleId}`, {
    data: { article: { id: articleId, body_html } },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PUT failed (${res.status}): ${err}`);
  }
  return res.json();
}

const blogCache = {};

async function main() {
  for (const fix of FIXES) {
    process.stdout.write(`Fixing ${fix.articleHandle}... `);
    if (!blogCache[fix.blogHandle]) {
      blogCache[fix.blogHandle] = await getBlogId(fix.blogHandle);
    }
    const blogId = blogCache[fix.blogHandle];
    const article = await getArticle(blogId, fix.articleHandle);
    const updated = article.body_html.replaceAll(fix.from, fix.to);
    if (updated === article.body_html) {
      console.log("SKIP (URL not found in body)");
      continue;
    }
    await updateArticle(blogId, article.id, updated);
    console.log("DONE");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
