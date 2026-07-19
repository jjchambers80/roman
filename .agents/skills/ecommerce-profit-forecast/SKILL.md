---
name: ecommerce-profit-forecast
description: Model ecommerce store revenue, gross margin, contribution margin, operating profit, break-even orders, and scenario forecasts after product, fulfillment, payment, marketing, platform, payroll, and overhead costs. Use for Shopify or other online-store pricing analysis, product or order economics, profit-margin checks, operating-cost allocation, break-even analysis, mock sales scenarios, price-change evaluation, and base/upside/downside forecasts.
---

# Ecommerce Profit Forecast

Build an auditable operating model, distinguish margin layers, and state every assumption. Treat sales tax collected as a liability rather than revenue. Do not infer missing costs as zero without flagging them.

## Workflow

1. Define the decision: price review, profit diagnosis, budget, break-even point, or revenue forecast.
2. Confirm the forecast period and currency.
3. Gather assumptions from user-provided files, prior reports, or the store. Never query or modify a live store unless explicitly authorized.
4. Normalize inputs using `assets/scenario-template.json`. Read `references/model-guide.md` when mapping unfamiliar financial data, allocating overhead, or explaining formulas.
5. Separate inputs into:
   - Revenue drivers: orders, growth, gross merchandise AOV, discounts, refunds, and shipping revenue.
   - Landed product cost: product COGS and inbound freight.
   - Other variable cost: packaging, pick/pack, outbound shipping, payment fees, commissions, and variable marketing.
   - Fixed operating cost: payroll, platform/apps, software, rent, insurance, professional services, and fixed marketing.
   - One-time cost: setup, launch, migration, equipment, or other nonrecurring spend.
6. Create at least base, downside, and upside cases when the user asks for a forecast and uncertainty is material. Change only named drivers and explain the changes.
7. Run the deterministic calculator:

```bash
python3 scripts/analyze_store.py path/to/scenario.json --format markdown
```

Use `--format json` for machine-readable output. The input may be one scenario object, an array of scenarios, or `{ "scenarios": [...] }`.

8. Sanity-check the result:
   - Reconcile period totals with forecast totals.
   - Verify gross margin exceeds contribution margin, which exceeds operating margin unless unusual negative costs exist.
   - Confirm percentage rates use decimals (`0.03`, not `3`).
   - Check whether AOV is before or after discounts; the template assumes before discounts.
   - Flag omitted categories, volatile assumptions, and capacity constraints.
9. Report the outcome in decision order: headline operating profit and margin, revenue, break-even volume, margin bridge, scenario comparison, assumptions, and risks.

## Required Output

Always label these separately:

- Gross merchandise revenue
- Net revenue
- Gross profit and gross margin
- Contribution profit and contribution margin
- Operating profit and operating margin
- Break-even orders per period

Include both total dollars and percentages. Show per-order economics when evaluating price. State whether one-time costs are included in operating profit. Never label contribution or gross margin as net profit.

## Guardrails

- Keep mock assumptions clearly marked as hypothetical.
- Exclude sales tax from revenue and expense unless the business absorbs a tax.
- Use refunds to reduce revenue; record return-processing or write-off costs separately when known.
- Allocate shared overhead consistently and disclose the driver. Prefer direct assignment, then activity drivers, then revenue share.
- Avoid double-counting fees already embedded in another cost input.
- Treat owner compensation consistently: include market-rate operating labor in payroll; separate owner distributions.
- Do not include income tax, debt principal, or inventory purchases as operating expense without explaining the accounting treatment.
- For cash-flow analysis, build a separate schedule for inventory timing, payment terms, capital spending, debt, and taxes; this calculator is an accrual-style operating forecast.

## Missing Data

When inputs are incomplete, provide a provisional range instead of false precision. Label assumptions as verified, user-supplied, estimated, or omitted. Prioritize confirming AOV, orders, discount/refund rates, landed COGS, fulfillment/shipping, payment fees, marketing, payroll, and platform/app costs.
