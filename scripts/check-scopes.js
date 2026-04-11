const TOKEN = 'shpat_REDACTED_ROTATE_ME';
const BASE = 'https://roman-skin.myshopify.com/admin/api/2026-04';
const H = { 'X-Shopify-Access-Token': TOKEN };

const checks = [
  ['read_products',     '/products.json?limit=1&fields=id'],
  ['read_orders',       '/orders.json?limit=1&fields=id&status=any'],
  ['read_customers',    '/customers.json?limit=1&fields=id'],
  ['read_inventory',    '/inventory_levels.json?limit=1'],
  ['read_draft_orders', '/draft_orders.json?limit=1&fields=id'],
  ['read_price_rules',  '/price_rules.json?limit=1&fields=id'],
  ['read_discounts',    '/discounts.json?limit=1'],
  ['read_themes',       '/themes.json?fields=id'],
  ['read_content',      '/pages.json?limit=1&fields=id'],
  ['read_locations',    '/locations.json?fields=id'],
  ['read_shipping',     '/shipping_zones.json'],
  ['read_reports',      '/reports.json?limit=1&fields=id'],
];

(async () => {
  for (const [label, path] of checks) {
    const r = await fetch(BASE + path, { headers: H });
    console.log((r.ok ? '✅' : '❌') + ' ' + label + ' (' + r.status + ')');
  }
})();
