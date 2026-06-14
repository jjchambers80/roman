/**
 * create-articles.js
 * Creates the three foundational SEO articles via Shopify Admin REST API.
 * Usage: node scripts/create-articles.js
 */
const { client, STORE } = require("./shopify");

async function fetchJSON(path, options = {}) {
  let res;
  if (!options.method || options.method === "GET") {
    res = await client.get(path, options.searchParams ? { searchParams: options.searchParams } : {});
  } else if (options.method === "POST") {
    res = await client.post(path, { data: options.data });
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function getBlogId(handle) {
  const res = await client.get("blogs");
  if (!res.ok) { const body = await res.text(); throw new Error(`HTTP ${res.status}: ${body}`); }
  const data = await res.json();
  const blog = data.blogs.find((b) => b.handle === handle);
  if (!blog) throw new Error(`Blog not found: ${handle}`);
  return blog.id;
}

async function articleExists(blogId, handle) {
  const res = await client.get(`blogs/${blogId}/articles`);
  if (!res.ok) { const body = await res.text(); throw new Error(`HTTP ${res.status}: ${body}`); }
  const data = await res.json();
  return data.articles.some((a) => a.handle === handle);
}

async function createArticle(blogId, article) {
  const res = await client.post(`blogs/${blogId}/articles`, { data: { article } });
  if (!res.ok) { const body = await res.text(); throw new Error(`HTTP ${res.status}: ${body}`); }
  const data = await res.json();
  return data.article;
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 1 — Skin Tips blog
// ─────────────────────────────────────────────────────────────────────────────
const ARTICLE_FOAMING_CLEANSER = {
  title: "Best Foaming Cleanser for Oily Skin: What to Look For",
  handle: "best-foaming-cleanser-for-oily-skin",
  author: "Betty Román",
  tags: "oily skin, cleanser, skin tips, double cleanse",
  published: true,
  summary_html:
    "<p>CIDESCO-certified esthetician Betty Román explains what makes a foaming cleanser ideal for oily skin — and what ingredients actually control sebum without stripping the skin barrier.</p>",
  body_html: `
<p>After 30 years as a licensed esthetician, I've seen the same mistake repeat itself in my treatment room: clients with oily skin over-cleansing in an attempt to stop shine, triggering their skin to produce even more oil. The cleanser you choose — and how you use it — makes more difference than almost any other step in your routine.</p>

<p>Choosing the best foaming cleanser for oily skin isn't just about finding something that lathers. It's about finding a formula that removes excess sebum, pollution, and sunscreen without compromising the skin's natural moisture barrier. When the barrier is intact, sebum production normalizes. When you strip it, your skin fights back.</p>

<h2>Why Oily Skin Needs a Foaming Cleanser</h2>

<p>Gel and foaming cleansers are the right choice for oily skin because their surfactant bases are better at dissolving sebum than cream or milk cleansers. The foam itself is a delivery mechanism — it disperses the active ingredients evenly across the skin surface and helps lift oil, bacteria, and environmental debris without physical scrubbing.</p>

<p>That said, not all foaming cleansers are created equal. A cleanser with a pH far above or below the skin's natural 4.5–5.5 range will disrupt the acid mantle and set off a cycle of compensatory oil production. Look for formulas that are pH-balanced and fragrance-free.</p>

<h2>Key Ingredients That Actually Work</h2>

<p>When evaluating a foaming cleanser for oily skin, these ingredients earn a place in the formula:</p>

<ul>
  <li><strong>Salicylic acid (0.5–2%)</strong> — A beta-hydroxy acid (BHA) that is oil-soluble, meaning it penetrates into the pore and dissolves the sebum plugs that cause congestion and breakouts. Even at low concentrations in a rinse-off cleanser, it provides meaningful exfoliation.</li>
  <li><strong>Niacinamide</strong> — Regulates sebum production at the cellular level and reduces the appearance of enlarged pores over time. It also has anti-inflammatory properties that calm redness in acne-prone skin.</li>
  <li><strong>Zinc PCA</strong> — A zinc salt of pyrrolidone carboxylic acid that controls shine by binding to the receptors that trigger sebum secretion. It's also antimicrobial, which helps reduce the bacteria associated with breakouts.</li>
  <li><strong>Glycerin</strong> — Oily skin still needs hydration. Glycerin is a humectant that draws water into the skin without adding oil, ensuring the cleanser removes sebum without stripping moisture.</li>
</ul>

<h2>What to Avoid</h2>

<p>Some ingredients common in drugstore foaming cleansers will do more harm than good for oily skin:</p>

<ul>
  <li><strong>Sodium lauryl sulfate (SLS)</strong> — A harsh surfactant that strips all lipids from the skin, including the ceramides and fatty acids that maintain the barrier. After washing with SLS, skin often feels "squeaky clean" — that sensation is your barrier being compromised.</li>
  <li><strong>Fragrance and essential oils</strong> — Inflammatory for most skin types, particularly when the skin is already prone to congestion.</li>
  <li><strong>Alcohol denat.</strong> — Often added to create a matte, tight feeling after cleansing. It temporarily reduces shine but significantly damages the moisture barrier, worsening oiliness within hours.</li>
</ul>

<h2>How to Cleanse Oily Skin Correctly</h2>

<p>Even the best foaming cleanser for oily skin won't perform well if the technique is off. Here is the approach I teach every client in my spa:</p>

<ol>
  <li><strong>Double cleanse in the evening.</strong> Use a gentle micellar water or cleansing oil first to remove sunscreen and makeup. Follow with your foaming cleanser. Foaming cleansers are not effective at removing SPF when used alone — they require a pre-cleanse step.</li>
  <li><strong>Use lukewarm water.</strong> Hot water disrupts the lipid barrier. Cold water does not fully emulsify the cleanser. Lukewarm is the correct temperature.</li>
  <li><strong>Massage for 60 seconds.</strong> Most people spend 15–20 seconds washing their face. Sixty seconds allows the actives to work and gives the surfactants time to fully lift debris from the pores.</li>
  <li><strong>Morning cleanse is optional.</strong> If your skin is very oily, a gentle foaming cleanse in the morning is appropriate. If your skin feels dry or tight in the morning, splash with water only — overnight, your skin has not accumulated the level of debris that requires a full cleanse.</li>
</ol>

<h2>What a Great Formula Looks Like in Practice</h2>

<p>The cleanser I formulated for Romàn Skin — the <a href="/products/balancing-skin-cleanser-for-all-skin-types">Balancing Foaming Cleanser</a> — addresses every one of these criteria. It contains salicylic acid, niacinamide, and zinc PCA in a pH-balanced, SLS-free base. The lather is dense enough to give the satisfying clean that oily skin needs, but the formula is calibrated to leave the moisture barrier intact.</p>

<p>I created it after 25 years of watching my spa clients use harsh drugstore cleansers that made their skin worse over time. The goal was a professional-grade formula that clients could use at home with the same confidence they had sitting in my treatment chair.</p>

<p>If you've been struggling to control shine without drying out your skin, the cleanser is almost always where the correction begins.</p>

<div style="margin: 40px 0; padding: 28px 32px; background: #f8f3ee; border-left: 3px solid #121212;">
  <p style="margin: 0 0 8px; font-size: 1.1rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5;">Featured Product</p>
  <p style="margin: 0 0 16px; font-size: 1.8rem; font-style: italic; font-weight: 400;">Balancing Foaming Cleanser</p>
  <p style="margin: 0 0 20px; opacity: 0.75;">Salicylic acid + niacinamide + zinc PCA. pH-balanced. SLS-free. Designed for oily and combination skin.</p>
  <a href="/products/balancing-skin-cleanser-for-all-skin-types" style="display: inline-block; background: #121212; color: #fff; padding: 12px 28px; text-decoration: none; font-size: 1.3rem; letter-spacing: 0.08em; text-transform: uppercase;">Shop Now</a>
</div>
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 2 — Ingredients blog
// ─────────────────────────────────────────────────────────────────────────────
const ARTICLE_VIT_C_WRINKLES = {
  title: "Does Vitamin C Serum Reduce Wrinkles? A Skin Care Expert Explains",
  handle: "does-vitamin-c-serum-reduce-wrinkles",
  author: "Betty Román",
  tags: "vitamin c, anti-aging, wrinkles, collagen, ingredients",
  published: true,
  summary_html:
    "<p>The science behind vitamin C and wrinkle reduction — what it actually does, how long it takes, and why ferulic acid is the ingredient that makes it work harder.</p>",
  body_html: `
<p>Vitamin C is one of the most studied actives in dermatology, and for good reason. After decades of clinical research and 30 years of professional experience, I can say with confidence: yes, a well-formulated vitamin C serum reduces wrinkles. But the answer has important qualifications that the marketing copy on most products never tells you.</p>

<h2>What Vitamin C Actually Does to Skin</h2>

<p>L-ascorbic acid — the form of vitamin C that your skin can actually use — works through several distinct mechanisms simultaneously:</p>

<ul>
  <li><strong>Collagen synthesis stimulation.</strong> Vitamin C is a required cofactor in the enzymatic reactions that produce collagen. Without adequate vitamin C, your fibroblasts cannot synthesize new collagen efficiently. This is why vitamin C deficiency (scurvy) causes skin to deteriorate rapidly. Topical vitamin C stimulates collagen production locally in the dermis, which is where the structural support for skin resides.</li>
  <li><strong>Antioxidant protection.</strong> UV radiation and pollution generate free radicals that degrade existing collagen and elastin. Vitamin C neutralizes these free radicals in the skin, slowing the breakdown of the collagen you already have. This protective effect is separate from the stimulatory one — you need both.</li>
  <li><strong>Melanin inhibition.</strong> Vitamin C inhibits the enzyme tyrosinase, which is required for melanin production. This is why it also fades dark spots and evens skin tone — a benefit that overlaps with wrinkle reduction because both are driven by UV-induced damage.</li>
</ul>

<h2>The Clinical Evidence</h2>

<p>A 2003 double-blind, randomized controlled trial published in the <em>Journal of the American Academy of Dermatology</em> found that topical 5% L-ascorbic acid significantly improved the appearance of fine lines and wrinkles after 16 weeks compared to placebo. Subjects also showed measurable increases in skin thickness — a direct indicator of collagen density.</p>

<p>More recent research has confirmed these findings across multiple concentrations (10%, 15%, and 20%) and shown that the combination of vitamin C with vitamin E and ferulic acid produces superior results compared to vitamin C alone — more on that below.</p>

<h2>Why Concentration and Formulation Matter Enormously</h2>

<p>This is the part most brands skip. L-ascorbic acid is notoriously unstable. It oxidizes when exposed to light, air, and water — turning orange or brown in the bottle. An oxidized vitamin C serum not only provides no benefit, it can cause oxidative stress in the skin.</p>

<p>Effective concentrations for anti-aging benefit range from 10–20%. Below 10%, the skin benefits are minimal. Above 20%, the increased irritation risk outweighs the marginal increase in efficacy. The serum must be formulated at a pH of 2.5–3.5 for L-ascorbic acid to penetrate the skin — at higher pH, it does not absorb.</p>

<p>These formulation constraints are why most vitamin C serums on the market underperform. Getting the concentration, pH, and stabilization right requires genuine formulation expertise.</p>

<h2>Why Ferulic Acid Makes the Difference</h2>

<p>Ferulic acid is a plant-derived antioxidant that performs two critical functions when paired with vitamin C:</p>

<ol>
  <li><strong>It doubles the photoprotective efficacy of vitamin C and E.</strong> Research from Duke University demonstrated that the combination of L-ascorbic acid, vitamin E, and ferulic acid provides eight times the photoprotection of skin alone. This dramatically amplifies the anti-wrinkle effect by reducing the UV damage that drives collagen degradation.</li>
  <li><strong>It stabilizes vitamin C in the formula.</strong> Ferulic acid lowers the oxidation rate of L-ascorbic acid, extending shelf life and ensuring the active remains potent from the first drop to the last. This is the technical reason a serum with ferulic acid outperforms a vitamin C serum without it.</li>
</ol>

<h2>How Long Until You See Results?</h2>

<p>Set realistic expectations: meaningful wrinkle reduction takes 12–16 weeks of consistent daily use. The collagen synthesis pathway is slow — fibroblasts do not produce visible structural changes overnight. What you will notice sooner (within 4–6 weeks) is improved brightness, more even tone, and a subtle plumping effect as hydration in the skin increases.</p>

<p>Consistency matters more than concentration. A 15% vitamin C serum used every morning for six months will outperform a 20% serum used sporadically.</p>

<h2>Who Benefits Most</h2>

<p>Vitamin C serum is appropriate for most adults over 25, but it delivers the greatest visible change to skin that shows:</p>

<ul>
  <li>Fine lines around the eyes and mouth from UV exposure</li>
  <li>Uneven tone or hyperpigmentation from sun damage</li>
  <li>Dullness or loss of luminosity</li>
  <li>Early loss of firmness</li>
</ul>

<p>For those with sensitive skin, start with a lower concentration (10%) and apply every other day initially to allow the skin to acclimate to the low pH.</p>

<div style="margin: 40px 0; padding: 28px 32px; background: #f8f3ee; border-left: 3px solid #121212;">
  <p style="margin: 0 0 8px; font-size: 1.1rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5;">Featured Product</p>
  <p style="margin: 0 0 16px; font-size: 1.8rem; font-style: italic; font-weight: 400;">Illuminating Vitamin C Serum with Ferulic Acid</p>
  <p style="margin: 0 0 20px; opacity: 0.75;">15% L-ascorbic acid with ferulic acid and vitamin E. pH-optimized for maximum absorption. Stabilized for full-bottle potency.</p>
  <a href="/products/rejuvenating-serum-with-ferulic-acid" style="display: inline-block; background: #121212; color: #fff; padding: 12px 28px; text-decoration: none; font-size: 1.3rem; letter-spacing: 0.08em; text-transform: uppercase;">Shop Now</a>
</div>
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE 3 — Ingredients blog
// ─────────────────────────────────────────────────────────────────────────────
const ARTICLE_DARK_SPOTS = {
  title: "How to Fade Dark Spots with Vitamin C Serum",
  handle: "how-to-fade-dark-spots-with-vitamin-c-serum",
  author: "Betty Román",
  tags: "dark spots, hyperpigmentation, vitamin c, brightening, ingredients",
  published: true,
  summary_html:
    "<p>Dark spots are one of the most common skin concerns — and vitamin C serum is one of the most effective evidence-based treatments. Here's how to use it correctly, and what timeline to expect.</p>",
  body_html: `
<p>Dark spots — called hyperpigmentation, post-inflammatory hyperpigmentation (PIH), or solar lentigines depending on their cause — are among the most persistent skin concerns I treat in my spa. They form when melanin, the pigment that gives skin its color, is overproduced in a localized area. The result is a patch that is darker than the surrounding skin.</p>

<p>Vitamin C serum is one of the most well-validated treatments for fading dark spots. But using it correctly matters enormously. In this guide I'll explain how it works, how to apply it for maximum effect, and what results you can realistically expect.</p>

<h2>What Causes Dark Spots?</h2>

<p>Dark spots form through one of three primary pathways:</p>

<ul>
  <li><strong>Sun damage (solar lentigines).</strong> Cumulative UV exposure triggers melanocytes — the cells that produce melanin — to overproduce in specific areas. These appear as flat, brown spots on areas with the most sun exposure: face, chest, shoulders, and hands.</li>
  <li><strong>Post-inflammatory hyperpigmentation (PIH).</strong> After any skin injury — a blemish, a cut, an aggressive peel — the skin's repair process can leave a dark mark as it heals. This is especially common in medium to deeper skin tones, where melanocytes are more reactive to inflammation.</li>
  <li><strong>Melasma.</strong> A hormonally influenced pattern of hyperpigmentation, often triggered by pregnancy, oral contraceptives, or sun exposure. It typically appears as larger, blotchy patches on the cheeks, forehead, and upper lip.</li>
</ul>

<h2>How Vitamin C Fades Hyperpigmentation</h2>

<p>Vitamin C (L-ascorbic acid) targets dark spots through a precise biochemical mechanism. The production of melanin requires an enzyme called tyrosinase. Tyrosinase converts tyrosine (an amino acid) into the precursors that eventually become melanin. L-ascorbic acid inhibits tyrosinase activity, reducing melanin synthesis in the treated area.</p>

<p>Simultaneously, vitamin C's antioxidant activity neutralizes the free radical damage that triggers melanocyte overstimulation in the first place. This means it addresses both the cause and the existing discoloration — a dual action that few other brightening ingredients match.</p>

<p>Unlike hydroquinone (which simply bleaches melanin), vitamin C does not thin or sensitize the skin. It is appropriate for long-term, continuous use.</p>

<h2>The Role of Ferulic Acid</h2>

<p>Ferulic acid, when combined with vitamin C, makes the serum significantly more effective at fading dark spots for two reasons:</p>

<ol>
  <li><strong>Enhanced UV protection.</strong> Since UV exposure is the primary driver of dark spot formation and recurrence, the added photoprotective effect of ferulic acid helps stop new spots from forming while the existing ones fade. A serum without this protection is fighting an uphill battle against ongoing sun damage.</li>
  <li><strong>Stabilization of L-ascorbic acid.</strong> Vitamin C that has oxidized in the bottle will not inhibit tyrosinase. Ferulic acid slows oxidation dramatically, ensuring the active ingredient arrives in your skin in its working form.</li>
</ol>

<h2>How to Use Vitamin C Serum to Fade Dark Spots</h2>

<p>Technique significantly impacts results. Follow this protocol:</p>

<ol>
  <li><strong>Apply every morning, not at night.</strong> Vitamin C's primary mechanism at this step is antioxidant protection against UV-induced damage. Applying it before sunscreen (and therefore before sun exposure) is when it works hardest. At night, a retinol or AHA exfoliant is a better choice to accelerate cell turnover and bring new, unpigmented skin to the surface faster.</li>
  <li><strong>Apply to clean, slightly damp skin.</strong> After cleansing, allow skin to dry for 30 seconds, then apply 3–4 drops of serum to the face and neck. Slightly damp skin allows the serum to spread more evenly.</li>
  <li><strong>Layer in the correct order.</strong> Vitamin C serum goes on first, before moisturizer and before SPF. The low-pH formula needs direct contact with skin to absorb.</li>
  <li><strong>Wear SPF 30 or higher every day without exception.</strong> This is non-negotiable. If you apply vitamin C and skip sunscreen, you will neutralize most of the brightening benefit because UV exposure immediately restimulates the melanocytes you are trying to calm. SPF is half the treatment.</li>
  <li><strong>Be consistent.</strong> Missing applications doesn't just slow progress — it allows the melanocytes to become active again. Daily use delivers results; sporadic use does not.</li>
</ol>

<h2>Timeline: What to Expect</h2>

<p>I tell my clients to evaluate their progress in 90-day increments:</p>

<ul>
  <li><strong>Weeks 1–4:</strong> Overall brightness and luminosity improve. The skin's surface texture evens out as cellular turnover accelerates. Most dark spots do not visibly change yet.</li>
  <li><strong>Weeks 4–8:</strong> Shallow, recent dark spots (especially PIH from blemishes within the past 6 months) begin to fade noticeably.</li>
  <li><strong>Weeks 8–16:</strong> Established sun spots and older hyperpigmentation show meaningful reduction. At 12–16 weeks, most clients see 30–50% improvement in spot intensity when using a well-formulated serum consistently.</li>
  <li><strong>Beyond 16 weeks:</strong> Continued use produces continued improvement. Deeply pigmented solar lentigines may require 6–12 months of consistent treatment. Melasma responds more slowly and often benefits from combination therapy with a dermatologist.</li>
</ul>

<p>Results depend on the depth of the pigmentation, skin tone, and how consistently the protocol is followed. Superficial PIH fades the fastest. Deep, long-standing sun damage takes the most time.</p>

<h2>Amplify Results: Complementary Ingredients</h2>

<p>To accelerate dark spot fading, pair your vitamin C serum with:</p>

<ul>
  <li><strong>Niacinamide (in your moisturizer or another serum, applied after vitamin C).</strong> Niacinamide inhibits the transfer of melanin from melanocytes to keratinocytes — a different point in the pigmentation pathway from tyrosinase inhibition. The two ingredients work synergistically.</li>
  <li><strong>AHA exfoliant (2–3 nights per week).</strong> Glycolic or lactic acid accelerates cellular turnover, bringing unpigmented cells to the surface faster and exfoliating the pigmented cells above.</li>
  <li><strong>Broad-spectrum SPF 50 with iron oxides (for melasma).</strong> Iron oxides block visible light, which also stimulates melanin in melasma-prone skin in addition to UV.</li>
</ul>

<div style="margin: 40px 0; padding: 28px 32px; background: #f8f3ee; border-left: 3px solid #121212;">
  <p style="margin: 0 0 8px; font-size: 1.1rem; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5;">Featured Product</p>
  <p style="margin: 0 0 16px; font-size: 1.8rem; font-style: italic; font-weight: 400;">Illuminating Vitamin C Serum with Ferulic Acid</p>
  <p style="margin: 0 0 20px; opacity: 0.75;">15% L-ascorbic acid with ferulic acid and vitamin E. Formulated to fade dark spots and prevent new ones from forming.</p>
  <a href="/products/rejuvenating-serum-with-ferulic-acid" style="display: inline-block; background: #121212; color: #fff; padding: 12px 28px; text-decoration: none; font-size: 1.3rem; letter-spacing: 0.08em; text-transform: uppercase;">Shop Now</a>
</div>
`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n✍️  Roman Skin — Article Creation\n${"─".repeat(50)}`);

  const skinTipsId = await getBlogId("skin-tips");
  const ingredientsId = await getBlogId("ingredients");

  console.log(`\n  Skin Tips blog id:  ${skinTipsId}`);
  console.log(`  Ingredients blog id: ${ingredientsId}\n`);

  const articles = [
    { blogId: skinTipsId, blogHandle: "skin-tips", article: ARTICLE_FOAMING_CLEANSER },
    { blogId: ingredientsId, blogHandle: "ingredients", article: ARTICLE_VIT_C_WRINKLES },
    { blogId: ingredientsId, blogHandle: "ingredients", article: ARTICLE_DARK_SPOTS },
  ];

  for (const { blogId, blogHandle, article } of articles) {
    const exists = await articleExists(blogId, article.handle);
    if (exists) {
      console.log(`  ✓ Already exists: "${article.title}"`);
    } else {
      const created = await createArticle(blogId, article);
      console.log(`  + Created: "${created.title}"`);
      console.log(`    → https://${STORE}/blogs/${blogHandle}/${created.handle}`);
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log("✅ Done. All articles are live.\n");
  console.log("View at:");
  console.log(`  https://${STORE}/pages/articles`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
