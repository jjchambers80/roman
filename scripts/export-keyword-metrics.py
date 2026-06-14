"""
export-keyword-metrics.py
Outputs enriched CSVs per ad group with search volume, competition, and bid data
from the original Google Ads export. Sorted by avg monthly searches descending.
Use these to prioritize which keywords to write SEO articles for.

Columns: Keyword | Avg Monthly Searches | Competition | Top of Page Bid High ($)
"""
import atexit
import os
import csv
import uuid
import openpyxl
from collections import defaultdict
from dotenv import load_dotenv
from posthog import Posthog

load_dotenv()

_posthog = Posthog(
    os.environ.get("POSTHOG_PROJECT_TOKEN", ""),
    host=os.environ.get("POSTHOG_HOST", "https://us.i.posthog.com"),
    enable_exception_autocapture=True,
) if os.environ.get("POSTHOG_PROJECT_TOKEN") else None

if _posthog:
    atexit.register(_posthog.shutdown)

_DISTINCT_ID = f"script-{uuid.uuid5(uuid.NAMESPACE_DNS, 'export-keyword-metrics')}"

# ── Load xlsx ────────────────────────────────────────────────────────────────

wb = openpyxl.load_workbook("keyword-research/raw/2026-04-25-google-ads-keyword-stats.xlsx")
ws = wb.active
rows = list(ws.iter_rows(values_only=True))

# Row 2 (index 2) = headers; rows 3+ = data
# Columns (0-indexed): 0=Keyword, 2=Avg monthly searches, 5=Competition, 8=Top of page bid high range
data_rows = [r for r in rows[3:] if r[0] is not None]

def parse_int(val):
    if val is None:
        return 0
    s = str(val).replace(",", "").strip()
    return int(s) if s.isdigit() else 0

def parse_float(val):
    if val is None:
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except (ValueError, TypeError):
        return None

all_kw = []
for r in data_rows:
    vol = parse_int(r[2])
    if vol >= 100:   # lower threshold here — we want metrics even for lower-vol terms
        bid_high = parse_float(r[8])
        all_kw.append({
            "keyword": r[0].lower().strip(),
            "vol": vol,
            "competition": str(r[5]).strip() if r[5] else "—",
            "bid_high": f"${bid_high:.2f}" if bid_high is not None else "—",
        })

# ── Competitor brands ────────────────────────────────────────────────────────

COMPETITOR_BRANDS = [
    "cerave", "skinceuticals", "obagi", "panoxyl", "neutrogena", "olay", "cetaphil",
    "la roche posay", "la roche", "elta md", "drunk elephant", "paula's choice",
    "paulas choice", "sunday riley", "kiehl", "dermalogica", "murad", "shiseido",
    "clarins", "tatcha", "cosrx", "the ordinary", "truskin", "naturium", "timeless",
    "maelove", "mad hippie", "vibriance", "vichy", "roc ", "loreal", "l oreal",
    "aveeno", "ponds", "hada labo", "isntree", "innisfree", "goodal", "ole henriksen",
    "olehenriksen", "beautystat", "brandefy", "medicube", "vanicream", "supergoop",
    "senka", "korres", "origins", "estee lauder", "bubble face", "rice water",
    "kate somerville", "biolumin", "claudie", "melano cc", "good molecules",
    "dr brenner", "dr dennis gross", "dennis gross", "derma e", "advanced clinicals",
    "beauty stat", "ordinary", "elf vitamin", "roc vitamin",
]

def is_competitor(kw):
    return any(b in kw for b in COMPETITOR_BRANDS)

# ── Group definitions (same as export-keyword-csvs.py) ──────────────────────

GROUPS = [
    ("01-foaming-face-wash-cleanser", "Foaming Face Wash & Cleanser",
     ["foaming face wash", "foaming cleanser", "foaming facial cleanser", "face wash",
      "facial cleanser", "foaming wash", "gentle foaming", "face cleanser",
      "facial wash", "daily cleanser", "foaming cream cleanser", "gel cleanser", "green tea cleanser"]),
    ("02-cleansing-milk-gentle-cleanser", "Cleansing Milk & Gentle Cleanser",
     ["cleansing milk", "gentle cleanser", "creamy cleanser", "cream cleanser",
      "milk cleanser", "sensitive skin cleanser", "non foaming cleanser",
      "non-foaming cleanser", "mild cleanser", "creamy facial", "moisturizing cleanser"]),
    ("03-toner-hydrating-essence", "Toner & Hydrating Essence",
     ["hyaluronic acid toner", "hydrating toner", "facial toner", "face toner",
      "hydrating essence", "essence toner", "botanical toner", "gentle toner",
      "skin toner", "toning", "essence lotion"]),
    ("07-ferulic-acid-pollution-defense", "Ferulic Acid & Pollution Defense Serum",
     ["ferulic acid serum", "ferulic serum", "vitamin c ferulic", "ferulic acid",
      "vitamin c and ferulic", "ce ferulic", "c e ferulic", "phloretin", "ferulic"]),
    ("08-hyaluronic-acid-serum", "Hyaluronic Acid Serum",
     ["hyaluronic acid serum", "hyaluronic serum", "ha serum", "hydrating serum",
      "moisture serum", "hydration serum", "hyaluronic acid facial serum",
      "hyaluronic acid for face", "vitamin e serum", "plumping serum"]),
    ("09-peptide-serum-growth-factor", "Peptide Serum & Botanical Growth Factor",
     ["growth factor serum", "peptide serum", "botanical growth factor",
      "anti-aging serum", "anti aging serum", "firming serum", "collagen serum",
      "revitalizing serum", "fine line serum", "wrinkle serum", "age defying serum"]),
    ("10-peptide-eye-cream", "Peptide Eye Cream",
     ["peptide eye cream", "eye cream", "hyaluronic acid eye cream", "eye creme",
      "collagen eye cream", "anti aging eye cream", "eye serum", "under eye cream",
      "eye treatment", "dark circle eye cream", "eye moisturizer", "eye contour"]),
    ("11-eye-patches", "Eye Patches",
     ["eye patches", "eye mask", "eye gel patches", "under eye patches", "eye patch",
      "collagen eye patches", "anti aging eye patches", "hydrating eye patches",
      "resveratrol eye", "pomegranate eye", "under eye mask"]),
    ("12-anti-aging-moisturizer", "Anti-Aging Moisturizer & Face Cream",
     ["anti aging moisturizer", "anti-aging moisturizer", "peptide moisturizer",
      "face moisturizer", "facial moisturizer", "face cream", "face lotion",
      "hyaluronic acid moisturizer", "moisturizer for aging", "moisturizer for dry skin",
      "best face moisturizer", "daily moisturizer", "multi peptide", "moisturizing cream",
      "firming moisturizer", "anti wrinkle moisturizer", "anti aging face cream"]),
    ("13-exfoliant-chemical-peel", "Exfoliant & Chemical Peel",
     ["glycolic acid", "chemical peel", "face peel", "exfoliant", "exfoliator",
      "aha exfoliant", "alpha hydroxy acid", "fruit enzyme", "enzyme exfoliant",
      "face scrub", "skin renewal", "peel treatment", "exfoliating", "lactic acid peel"]),
    ("14-face-mask", "Face Mask",
     ["face mask", "facial mask", "hydrating mask", "gel mask", "brightening mask",
      "calming mask", "soothing mask", "hyaluronic acid mask", "vitamin c mask",
      "anti aging mask", "antioxidant mask", "blueberry mask", "skin mask"]),
]

VC_MATCH_TERMS = [
    "vitamin c serum", "best vitamin c serum", "vitamin c brightening serum",
    "vitamin c antioxidant serum", "super c serum", "vitamin c for face",
    "vitamin c for skin", "vitamin c for dark spots", "vitamin c hyperpigmentation",
    "vitamin c brightening", "brightening serum", "illuminating serum",
    "ascorbic acid serum", "sodium ascorbyl", "vitamin ce", "vitamin c daily",
    "antioxidant serum", "vitamin c serum for face", "vitamin c serum benefits",
    "vit c serum", "vitamin c and hyaluronic acid serum", "vitamin c niacinamide",
    "vitamin c for hyperpigmentation", "vitamin c for pigmentation",
    "serum for brightening", "face brightening serum", "brightening face serum",
]

VC_BRIGHTENING = ["brightening", "dark spot", "dark circle", "pigment", "hyperpigment",
                  "whitening", "lightening", "glowing", "illuminate", "skin tone",
                  "discolor", "uneven", "melasma", "scars", "spots", "fade", "dull"]

VC_ANTIAGING = ["wrinkle", "anti aging", "anti-aging", "over 50", "mature skin", "fine line",
                "firming", "collagen", "retinol", "lifting", "sagging", "age spot",
                "elasticity", "peptide", "plump"]

def vc_subgroup(kw):
    for t in VC_BRIGHTENING:
        if t in kw:
            return "05-vitamin-c-serum-brightening-dark-spots"
    for t in VC_ANTIAGING:
        if t in kw:
            return "06-vitamin-c-serum-anti-aging"
    return "04-vitamin-c-serum-core"

SLUG_LABELS = {g[0]: g[1] for g in GROUPS}
SLUG_LABELS.update({
    "04-vitamin-c-serum-core": "Vitamin C Serum - Core",
    "05-vitamin-c-serum-brightening-dark-spots": "Vitamin C Serum - Brightening & Dark Spots",
    "06-vitamin-c-serum-anti-aging": "Vitamin C Serum - Anti-Aging & Wrinkles",
})

# ── Classify ─────────────────────────────────────────────────────────────────

group_keywords = defaultdict(list)

for item in all_kw:
    kw = item["keyword"]
    if is_competitor(kw):
        continue

    vc_match = False
    for term in VC_MATCH_TERMS:
        if term in kw:
            slug = vc_subgroup(kw)
            group_keywords[slug].append(item)
            vc_match = True
            break
    if vc_match:
        continue

    for slug, label, terms in GROUPS:
        matched = False
        for term in terms:
            if term in kw:
                group_keywords[slug].append(item)
                matched = True
                break
        if matched:
            break

# ── Write enriched CSVs ───────────────────────────────────────────────────────

out_dir = "keyword-research/processed/seo-prioritized"
os.makedirs(out_dir, exist_ok=True)

all_slugs = [g[0] for g in GROUPS[:3]]
all_slugs += ["04-vitamin-c-serum-core",
              "05-vitamin-c-serum-brightening-dark-spots",
              "06-vitamin-c-serum-anti-aging"]
all_slugs += [g[0] for g in GROUPS[3:]]

written = []
for slug in all_slugs:
    items = group_keywords[slug]
    if not items:
        continue
    # Deduplicate by keyword, keep highest vol
    seen = {}
    for item in items:
        kw = item["keyword"]
        if kw not in seen or item["vol"] > seen[kw]["vol"]:
            seen[kw] = item
    items = sorted(seen.values(), key=lambda x: x["vol"], reverse=True)

    filename = f"{slug}.csv"
    path = os.path.join(out_dir, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Keyword", "Avg Monthly Searches", "Competition", "Top of Page Bid High"])
        for item in items:
            writer.writerow([item["keyword"], item["vol"], item["competition"], item["bid_high"]])
    written.append((slug, SLUG_LABELS.get(slug, slug), len(items), items[0]["keyword"], items[0]["vol"]))

# ── Print summary ─────────────────────────────────────────────────────────────

print(f"\nWrote {len(written)} enriched CSVs to {out_dir}/\n")
print(f"{'Ad Group':<50} {'KWs':>4}  {'Top keyword (highest vol)':<45} {'Vol':>8}")
print("-" * 115)
for slug, label, count, top_kw, top_vol in written:
    print(f"{label:<50} {count:>4}  {top_kw:<45} {top_vol:>8,}")
print()

# ── Cross-group SEO article candidates (top 5 per group by volume) ───────────
print("=" * 115)
print("TOP SEO ARTICLE CANDIDATES — highest-volume keyword per group")
print("=" * 115)
print(f"{'Ad Group':<50} {'Keyword':<45} {'Vol':>8}  {'Competition':<12}  {'Bid High':>10}")
print("-" * 115)

article_candidates = []
for slug in all_slugs:
    items = group_keywords[slug]
    if not items:
        continue
    seen = {}
    for item in items:
        kw = item["keyword"]
        if kw not in seen or item["vol"] > seen[kw]["vol"]:
            seen[kw] = item
    top5 = sorted(seen.values(), key=lambda x: x["vol"], reverse=True)[:5]
    label = SLUG_LABELS.get(slug, slug)
    for item in top5:
        article_candidates.append((label, item["keyword"], item["vol"], item["competition"], item["bid_high"]))

article_candidates.sort(key=lambda x: x[2], reverse=True)
for label, kw, vol, comp, bid in article_candidates:
    print(f"{label:<50} {kw:<45} {vol:>8,}  {comp:<12}  {bid:>10}")

if _posthog:
    total_kw = sum(count for _, _, count, _, _ in written)
    _posthog.capture(
        distinct_id=_DISTINCT_ID,
        event="keyword_metrics_exported",
        properties={
            "files_written": len(written),
            "total_keywords": total_kw,
            "output_dir": out_dir,
        },
    )
