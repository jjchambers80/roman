const { graphqlClient } = require("./shopify");

const APPLY = process.argv.includes("--apply");

const POLICY_BODY = `
<h2>60-Day Satisfaction Guarantee</h2>
<p>Skincare takes consistency—and the right fit. Products purchased directly from RomanSkinCare.com are covered by our 60-Day Satisfaction Guarantee.</p>
<p>If a product is not right for you, contact us within 60 days of delivery. Opened products are eligible when at least 50% of the product remains.</p>

<h3>How to start a return</h3>
<p>Contact Customer Care through our <a href="/pages/contact">Contact page</a> and include your order number and the product you would like to return. We will provide return authorization and instructions. Your return must be shipped within 14 days of authorization.</p>

<h3>Eligibility</h3>
<ul>
  <li>The product must have been purchased directly from RomanSkinCare.com.</li>
  <li>Opened products must have at least 50% of the product remaining.</li>
  <li>Satisfaction returns are limited to one return per product, per household.</li>
  <li>Sets and bundles must be returned together. Partial sets are not eligible for a refund.</li>
  <li>Gift cards and final-sale items are not returnable.</li>
</ul>

<h3>Shipping and refunds</h3>
<p>Original and return shipping charges are not refundable unless the item arrived damaged, defective, or incorrect. Once we receive and inspect the return, approved refunds are processed to the original payment method within 5–7 business days.</p>

<h3>Damaged, defective, or incorrect items</h3>
<p>If your order arrived damaged, defective, or incorrect, contact us promptly through our <a href="/pages/contact">Contact page</a> with your order number and photos so we can make it right.</p>

<h3>Policy misuse</h3>
<p>We monitor return activity and reserve the right to limit or refuse requests involving suspected misuse, fraud, or excessive returns.</p>
`.trim();

if (!APPLY) {
  console.log("Preview only. No Shopify data was changed.\n");
  console.log(POLICY_BODY);
  console.log("\nRun with --apply to replace the live Shopify refund policy.");
  process.exit(0);
}

const mutation = `
  mutation UpdateRefundPolicy($shopPolicy: ShopPolicyInput!) {
    shopPolicyUpdate(shopPolicy: $shopPolicy) {
      shopPolicy {
        title
        type
        updatedAt
        url
      }
      userErrors {
        field
        message
      }
    }
  }
`;

(async () => {
  const { data, errors } = await graphqlClient.request(mutation, {
    variables: {
      shopPolicy: {
        body: POLICY_BODY,
        type: "REFUND_POLICY",
      },
    },
  });

  if (errors) {
    throw new Error(JSON.stringify(errors));
  }

  const result = data.shopPolicyUpdate;
  if (result.userErrors.length) {
    throw new Error(JSON.stringify(result.userErrors));
  }

  console.log(`Updated ${result.shopPolicy.title}: ${result.shopPolicy.url}`);
  console.log(`Updated at ${result.shopPolicy.updatedAt}`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
