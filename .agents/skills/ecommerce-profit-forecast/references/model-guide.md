# Ecommerce operating model guide

## Contents

- Definitions and formulas
- Cost classification
- Overhead allocation
- Scenario design
- Interpretation and checks

## Definitions and formulas

For period `t`:

```text
orders[t] = starting_orders * (1 + order_growth_rate)^(t - 1)
merchandise_revenue = orders * gross_merchandise_aov
discounts = merchandise_revenue * discount_rate
refunds = (merchandise_revenue - discounts) * refund_rate
shipping_revenue = orders * shipping_revenue_per_order
net_revenue = merchandise_revenue - discounts - refunds + shipping_revenue

landed_cogs = orders * sum(landed_cogs_per_order)
gross_profit = net_revenue - landed_cogs

other_variable_cost = orders * sum(variable_costs_per_order)
                      + net_revenue * sum(variable_cost_rates)
contribution_profit = gross_profit - other_variable_cost

operating_profit = contribution_profit - fixed_costs - one_time_costs
```

Margin equals the related profit divided by net revenue. If net revenue is zero, report margin as unavailable.

Break-even orders use the first period's contribution per order:

```text
break_even_orders = fixed_costs / contribution_profit_per_order
```

Exclude one-time costs from recurring break-even unless the decision requires recovering them in a defined period. If contribution per order is zero or negative, recurring break-even is not attainable at the modeled economics.

## Cost classification

| Layer | Typical items | Driver |
| --- | --- | --- |
| Landed COGS | product cost, formula/fill, labels, inbound freight, duties | per unit/order |
| Other variable | packaging, pick/pack, outbound shipping, transaction fees, marketplace fees, affiliate commission, variable ad spend | per order or % revenue |
| Fixed operating | salaries, contractor retainers, Shopify plan, apps, software, insurance, storage minimums, accounting | per period |
| One-time | redesign, migration, launch creative, equipment, setup | named period |

Classify costs by economic behavior, not vendor name. A vendor invoice may contain both fixed and variable components. Put product and inbound freight in landed COGS when gross margin should reflect the cost of making inventory saleable. Put outbound fulfillment below gross margin so contribution margin remains visible.

Payment fees normally apply to the amount charged, which can differ slightly from net revenue after refunds. Use a revenue-rate approximation for planning; use transaction-level data for close accounting.

## Overhead allocation

Use this hierarchy:

1. Directly assign costs traceable to the store, product, or channel.
2. Use an activity driver: orders for fulfillment support, labor hours for staff, storage volume for warehousing, or transactions for software.
3. Use revenue share only when no causal driver is practical.

For a whole-store forecast, include 100% of ecommerce-only overhead. For a product or channel analysis, show both contribution before shared overhead and operating profit after allocated overhead. State the allocation basis and run a sensitivity when it changes the decision.

## Scenario design

Use named, defensible changes rather than a blanket percentage:

| Driver | Downside example | Base | Upside example |
| --- | --- | --- | --- |
| Orders | slower acquisition or conversion | current plan | stronger conversion/retention |
| AOV | mix shifts lower | observed average | bundle or price lift |
| Refund rate | higher than recent average | recent average | improved fit/education |
| COGS | supplier or freight pressure | current quote | volume discount |
| Marketing | higher acquisition cost | budget | efficiency gain |

Do not assume volume growth has no capacity or working-capital effect. Flag inventory, labor, fulfillment, and ad-spend constraints even when they are outside this accrual model.

## Interpretation and checks

- Gross margin measures product economics after landed product cost.
- Contribution margin measures whether each incremental order helps cover overhead.
- Operating margin measures store profitability after recurring overhead and modeled one-time costs.
- Revenue growth can destroy profit when contribution per order is negative.
- A price change affects revenue, percentage-based fees, demand, discounts, and potentially product mix; model all material effects.
- Compare forecast results to actuals using the same definitions.

Reconcile totals, inspect any negative line, and disclose categories modeled as zero. Round only displayed values; retain full precision in calculations.
