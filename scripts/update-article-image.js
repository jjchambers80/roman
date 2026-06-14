/**
 * update-article-image.js
 * Sets a Shopify article's featured image from a local file.
 * Usage:
 *   node scripts/update-article-image.js <blog-handle> <article-handle> <image-path> [alt-text]
 */
const { client, STORE } = require("./shopify");

const fs = require("fs");
const path = require("path");

const [, , blogHandle, articleHandle, imageArg, altTextArg] = process.argv;

if (!blogHandle || !articleHandle || !imageArg) {
  console.error(
    "Usage: node scripts/update-article-image.js <blog-handle> <article-handle> <image-path> [alt-text]"
  );
  process.exit(1);
}

const imagePath = path.resolve(imageArg);

if (!fs.existsSync(imagePath)) {
  console.error(`Image not found: ${imagePath}`);
  process.exit(1);
}

async function fetchJSON(path_, method, data) {
  let res;
  if (!method || method === "GET") {
    res = await client.get(path_);
  } else if (method === "PUT") {
    res = await client.put(path_, { data });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function getBlogId(handle) {
  const data = await fetchJSON("blogs");
  const blog = data.blogs.find((item) => item.handle === handle);
  if (!blog) {
    throw new Error(`Blog not found: ${handle}`);
  }
  return blog.id;
}

async function getArticle(blogId, handle) {
  const data = await fetchJSON(`blogs/${blogId}/articles`);
  const article = data.articles.find((item) => item.handle === handle);
  if (!article) {
    throw new Error(`Article not found in blog ${blogId}: ${handle}`);
  }
  return article;
}

async function updateArticleImage(blogId, articleId, articleTitle) {
  const attachment = fs.readFileSync(imagePath).toString("base64");
  const filename = path.basename(imagePath);
  const altText =
    altTextArg ||
    `${articleTitle} featured image`;

  const data = await fetchJSON(`blogs/${blogId}/articles/${articleId}`, "PUT", {
    article: {
      id: articleId,
      image: {
        attachment,
        filename,
        alt: altText,
      },
    },
  });

  return data.article;
}

async function main() {
  console.log(`Updating article image on ${STORE}`);
  console.log(`Blog: ${blogHandle}`);
  console.log(`Article: ${articleHandle}`);
  console.log(`Image: ${imagePath}`);

  const blogId = await getBlogId(blogHandle);
  const article = await getArticle(blogId, articleHandle);
  const updated = await updateArticleImage(blogId, article.id, article.title);

  console.log(`Updated article ${updated.id}: ${updated.title}`);
  if (updated.image?.src) {
    console.log(`Image URL: ${updated.image.src}`);
  }
  console.log(`Article URL: https://${STORE}/blogs/${blogHandle}/${updated.handle}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
