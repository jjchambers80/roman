#!/usr/bin/env python3
"""Calculate ecommerce revenue and operating margins from JSON assumptions."""

import argparse
import json
import math
import sys
from pathlib import Path


def number(value, field):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f"{field} must be a finite number")
    return float(value)


def nonnegative(value, field):
    value = number(value, field)
    if value < 0:
        raise ValueError(f"{field} must be nonnegative")
    return value


def rate(value, field):
    value = number(value, field)
    if value < 0 or value > 1:
        raise ValueError(f"{field} must be between 0 and 1")
    return value


def cost_map(data, field):
    values = data.get(field, {})
    if not isinstance(values, dict):
        raise ValueError(f"{field} must be an object")
    return {key: nonnegative(value, f"{field}.{key}") for key, value in values.items()}


def money(value, currency):
    return f"{currency} {value:,.2f}"


def percent(value):
    return "n/a" if value is None else f"{value:.1%}"


def analyze(data):
    if not isinstance(data, dict):
        raise ValueError("each scenario must be an object")

    name = str(data.get("name", "Scenario"))
    currency = str(data.get("currency", "USD"))
    periods = data.get("forecast_periods")
    if isinstance(periods, bool) or not isinstance(periods, int) or periods < 1:
        raise ValueError("forecast_periods must be a positive integer")

    starting_orders = nonnegative(data.get("starting_orders"), "starting_orders")
    growth = number(data.get("order_growth_rate", 0), "order_growth_rate")
    if growth <= -1:
        raise ValueError("order_growth_rate must be greater than -1")
    aov = nonnegative(data.get("gross_merchandise_aov"), "gross_merchandise_aov")
    discount_rate = rate(data.get("discount_rate", 0), "discount_rate")
    refund_rate = rate(data.get("refund_rate", 0), "refund_rate")
    shipping_revenue = nonnegative(data.get("shipping_revenue_per_order", 0), "shipping_revenue_per_order")

    landed = cost_map(data, "landed_cogs_per_order")
    variable_per_order = cost_map(data, "variable_costs_per_order")
    variable_rates = cost_map(data, "variable_cost_rates")
    for key, value in variable_rates.items():
        rate(value, f"variable_cost_rates.{key}")
    fixed = cost_map(data, "fixed_costs_per_period")

    one_time_raw = data.get("one_time_costs_by_period", {})
    if not isinstance(one_time_raw, dict):
        raise ValueError("one_time_costs_by_period must be an object")
    one_time = {}
    for period, costs in one_time_raw.items():
        try:
            period_number = int(period)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"one-time cost period {period!r} must be an integer") from exc
        if period_number < 1 or period_number > periods:
            raise ValueError(f"one-time cost period {period_number} is outside the forecast")
        if not isinstance(costs, dict):
            raise ValueError(f"one_time_costs_by_period.{period} must be an object")
        one_time[period_number] = sum(
            nonnegative(value, f"one_time_costs_by_period.{period}.{key}")
            for key, value in costs.items()
        )

    landed_per_order = sum(landed.values())
    other_variable_per_order = sum(variable_per_order.values())
    variable_rate_total = sum(variable_rates.values())
    fixed_total = sum(fixed.values())
    rows = []

    for period in range(1, periods + 1):
        orders = starting_orders * ((1 + growth) ** (period - 1))
        merchandise_revenue = orders * aov
        discounts = merchandise_revenue * discount_rate
        refunds = (merchandise_revenue - discounts) * refund_rate
        net_revenue = merchandise_revenue - discounts - refunds + orders * shipping_revenue
        landed_cogs = orders * landed_per_order
        gross_profit = net_revenue - landed_cogs
        other_variable_cost = orders * other_variable_per_order + net_revenue * variable_rate_total
        contribution_profit = gross_profit - other_variable_cost
        one_time_cost = one_time.get(period, 0.0)
        operating_profit = contribution_profit - fixed_total - one_time_cost
        rows.append({
            "period": period,
            "orders": orders,
            "gross_merchandise_revenue": merchandise_revenue,
            "discounts": discounts,
            "refunds": refunds,
            "net_revenue": net_revenue,
            "landed_cogs": landed_cogs,
            "gross_profit": gross_profit,
            "other_variable_cost": other_variable_cost,
            "contribution_profit": contribution_profit,
            "fixed_cost": fixed_total,
            "one_time_cost": one_time_cost,
            "operating_profit": operating_profit,
        })

    keys = [key for key in rows[0] if key != "period"]
    totals = {key: sum(row[key] for row in rows) for key in keys}
    net_revenue_total = totals["net_revenue"]
    margins = {
        "gross_margin": totals["gross_profit"] / net_revenue_total if net_revenue_total else None,
        "contribution_margin": totals["contribution_profit"] / net_revenue_total if net_revenue_total else None,
        "operating_margin": totals["operating_profit"] / net_revenue_total if net_revenue_total else None,
    }

    first = rows[0]
    contribution_per_order = first["contribution_profit"] / first["orders"] if first["orders"] else None
    break_even = fixed_total / contribution_per_order if contribution_per_order and contribution_per_order > 0 else None
    omitted = []
    for field in ("landed_cogs_per_order", "variable_costs_per_order", "variable_cost_rates", "fixed_costs_per_period"):
        if not data.get(field):
            omitted.append(field)

    return {
        "name": name,
        "currency": currency,
        "periods": rows,
        "totals": totals,
        "margins": margins,
        "break_even_orders_per_period_excluding_one_time_costs": break_even,
        "first_period_contribution_per_order": contribution_per_order,
        "omitted_cost_groups": omitted,
    }


def markdown(result):
    currency = result["currency"]
    totals = result["totals"]
    margins = result["margins"]
    break_even = result["break_even_orders_per_period_excluding_one_time_costs"]
    lines = [
        f"## {result['name']}",
        "",
        f"- Gross merchandise revenue: {money(totals['gross_merchandise_revenue'], currency)}",
        f"- Net revenue: {money(totals['net_revenue'], currency)}",
        f"- Gross profit: {money(totals['gross_profit'], currency)} ({percent(margins['gross_margin'])})",
        f"- Contribution profit: {money(totals['contribution_profit'], currency)} ({percent(margins['contribution_margin'])})",
        f"- Operating profit: {money(totals['operating_profit'], currency)} ({percent(margins['operating_margin'])})",
        f"- First-period contribution per order: {money(result['first_period_contribution_per_order'] or 0, currency)}",
        f"- Recurring break-even orders per period: {'not attainable' if break_even is None else f'{break_even:,.1f}'}",
        "",
        "| Period | Orders | Net revenue | Gross profit | Contribution | Operating profit |",
        "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in result["periods"]:
        lines.append(
            f"| {row['period']} | {row['orders']:,.1f} | {money(row['net_revenue'], currency)} | "
            f"{money(row['gross_profit'], currency)} | {money(row['contribution_profit'], currency)} | "
            f"{money(row['operating_profit'], currency)} |"
        )
    if result["omitted_cost_groups"]:
        lines.extend(["", "Warning: omitted cost groups: " + ", ".join(result["omitted_cost_groups"])])
    return "\n".join(lines)


def load_scenarios(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and "scenarios" in payload:
        if not isinstance(payload["scenarios"], list):
            raise ValueError("scenarios must be an array")
        return payload["scenarios"]
    return [payload]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="JSON scenario file")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    args = parser.parse_args()
    try:
        results = [analyze(scenario) for scenario in load_scenarios(args.input)]
    except (OSError, json.JSONDecodeError, ValueError, TypeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.format == "json":
        print(json.dumps(results[0] if len(results) == 1 else results, indent=2))
    else:
        print("\n\n".join(markdown(result) for result in results))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
