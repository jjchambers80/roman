const { client } = require("./shopify");

const checks = [
  ['read_products',     'products',        { limit: 1, fields: 'id' }],
  ['read_orders',       'orders',          { limit: 1, fields: 'id', status: 'any' }],
  ['read_customers',    'customers',       { limit: 1, fields: 'id' }],
  ['read_inventory',    'inventory_levels',{ limit: 1 }],
  ['read_draft_orders', 'draft_orders',    { limit: 1, fields: 'id' }],
  ['read_price_rules',  'price_rules',     { limit: 1, fields: 'id' }],
  ['read_discounts',    'discounts',       { limit: 1 }],
  ['read_themes',       'themes',          { fields: 'id' }],
  ['read_content',      'pages',           { limit: 1, fields: 'id' }],
  ['read_locations',    'locations',       { fields: 'id' }],
  ['read_shipping',     'shipping_zones',  {}],
  ['read_reports',      'reports',         { limit: 1, fields: 'id' }],
];

(async () => {
  for (const [label, path, searchParams] of checks) {
    const r = await client.get(path, { searchParams });
    console.log((r.ok ? '✅' : '❌') + ' ' + label + ' (' + r.status + ')');
  }
})();
