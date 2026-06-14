"""
export-keyword-csvs.py
Reads Google Ads keyword export, classifies into ad groups, splits Vitamin C
into 3 themed sub-groups, and writes one CSV per group to
keyword-research/processed/ad-groups/ — ready for Google Ads Keyword Planner upload.
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

_DISTINCT_ID = f"script-{uuid.uuid5(uuid.NAMESPACE_DNS, 'export-keyword-csvs')}"

# ── Setup ────────────────────────────────────────────────────────────────────

wb = openpyxl.load_workbook("keyword-research/raw/2026-04-25-google-ads-keyword-stats.xlsx")
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
data_rows = [r for r in rows[3:] if r[0] is not None]

all_kw = []
for r in data_rows:
    vol = r[2]
    if vol and str(vol).replace(",", "").isdigit() and int(str(vol).replace(",", "")) >= 500:
        all_kw.append({
            "keyword": r[0].lower().strip(),
            "vol": int(str(vol).replace(",", "")),
        })

# ── Competitor brands (excluded from generic group CSVs) ─────────────────────

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

# ── Primary ad groups ────────────────────────────────────────────────────────

GROUPS = [
    (
        "01-foaming-face-wash-cleanser",
        "Foaming Face Wash & Cleanser",
        ["foaming face wash", "foaming cleanser", "foaming facial cleanser", "face wash",
         "facial cleanser", "foaming wash", "gentle foaming", "antioxidant cleanser",
         "face cleanser", "facial wash", "daily cleanser", "foaming cream cleanser",
         "gel cleanser", "green tea cleanser"],
    ),
    (
        "02-cleansing-milk-gentle-cleanser",
        "Cleansing Milk & Gentle Cleanser",
        ["cleansing milk", "gentle cleanser", "creamy cleanser", "cream cleanser",
         "milk cleanser", "sensitive skin cleanser", "non foaming cleanser",
         "non-foaming cleanser", "mild cleanser", "creamy facial", "makeup cleanser",
         "shea butter cleanser", "moisturizing cleanser"],
    ),
    (
        "03-toner-hydrating-essence",
        "Toner & Hydrating Essence",
        ["hyaluronic acid toner", "hydrating toner", "facial toner", "face toner",
         "hydrating essence", "essence toner", "toner for sensitive", "botanical toner",
         "gentle toner", "skin toner", "toning", "essence lotion"],
    ),
    # Vitamin C is handled separately below
    (
        "07-ferulic-acid-pollution-defense",
        "Ferulic Acid & Pollution Defense Serum",
        ["ferulic acid serum", "ferulic serum", "vitamin c ferulic", "ferulic acid",
         "vitamin c and ferulic", "ce ferulic", "c e ferulic", "phloretin",
         "vitamin c pollution", "pollution defense serum", "ferulic"],
    ),
    (
        "08-hyaluronic-acid-serum",
        "Hyaluronic Acid Serum",
        ["hyaluronic acid serum", "hyaluronic serum", "ha serum", "hydrating serum",
         "moisture serum", "hydration serum", "hyaluronic acid facial serum",
         "hyaluronic acid for face", "vitamin e serum", "vitamin e face serum",
         "plumping serum", "hyaluronic acid and vitamin e"],
    ),
    (
        "09-peptide-serum-growth-factor",
        "Peptide Serum & Botanical Growth Factor",
        ["growth factor serum", "peptide serum", "botanical growth factor",
         "anti-aging serum", "anti aging serum", "firming serum", "collagen serum",
         "revitalizing serum", "skin renewal serum", "fine line serum", "wrinkle serum",
         "age defying serum", "neuropeptide serum", "oligopeptide"],
    ),
    (
        "10-peptide-eye-cream",
        "Peptide Eye Cream",
        ["peptide eye cream", "eye cream", "hyaluronic acid eye cream", "eye creme",
         "collagen eye cream", "anti aging eye cream", "eye cream for wrinkles",
         "eye serum", "under eye cream", "eye treatment", "dark circle eye cream",
         "eye moisturizer", "eye contour"],
    ),
    (
        "11-eye-patches",
        "Eye Patches",
        ["eye patches", "eye mask", "eye gel patches", "under eye patches", "eye patch",
         "collagen eye patches", "anti aging eye patches", "hydrating eye patches",
         "resveratrol eye", "pomegranate eye", "gold eye patches", "under eye mask"],
    ),
    (
        "12-anti-aging-moisturizer",
        "Anti-Aging Moisturizer & Face Cream",
        ["anti aging moisturizer", "anti-aging moisturizer", "peptide moisturizer",
         "face moisturizer", "facial moisturizer", "face cream", "face lotion",
         "hyaluronic acid moisturizer", "moisturizer for aging", "moisturizer for dry skin",
         "best face moisturizer", "daily moisturizer", "multi peptide", "moisturizing cream",
         "hydrating moisturizer", "firming moisturizer", "anti wrinkle moisturizer",
         "anti aging face cream"],
    ),
    (
        "13-exfoliant-chemical-peel",
        "Exfoliant & Chemical Peel",
        ["glycolic acid", "chemical peel", "face peel", "exfoliant", "exfoliator",
         "aha exfoliant", "alpha hydroxy acid", "fruit enzyme", "enzyme exfoliant",
         "face scrub", "skin renewal", "peel treatment", "exfoliating", "lactic acid peel",
         "pumpkin peel", "brightening exfoliant", "skin resurfacing"],
    ),
    (
        "14-face-mask",
        "Face Mask",
        ["face mask", "facial mask", "hydrating mask", "gel mask", "brightening mask",
         "calming mask", "soothing mask", "hyaluronic acid mask", "vitamin c mask",
         "anti aging mask", "antioxidant mask", "blueberry mask", "skin mask"],
    ),
]

# ── Vitamin C sub-group theme keywords ───────────────────────────────────────

VC_BRIGHTENING = [
    "brightening", "dark spot", "dark circle", "pigment", "hyperpigment",
    "whitening", "lightening", "glowing", "illuminate", "skin tone", "even skin",
    "discolor", "uneven", "melasma", "scars", "spots", "fade", "dull",
]

VC_ANTIAGING = [
    "wrinkle", "anti aging", "anti-aging", "over 50", "mature skin", "fine line",
    "firming", "collagen", "retinol", "lifting", "sagging", "age spot",
    "elasticity", "peptide", "plump",
]

# VC_CORE catches everything else in the Vitamin C group

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

def vc_subgroup(kw):
    """Return the Vitamin C sub-group slug for a keyword."""
    for theme in VC_BRIGHTENING:
        if theme in kw:
            return "05-vitamin-c-serum-brightening-dark-spots"
    for theme in VC_ANTIAGING:
        if theme in kw:
            return "06-vitamin-c-serum-anti-aging"
    return "04-vitamin-c-serum-core"

VC_LABELS = {
    "04-vitamin-c-serum-core": "Vitamin C Serum - Core",
    "05-vitamin-c-serum-brightening-dark-spots": "Vitamin C Serum - Brightening & Dark Spots",
    "06-vitamin-c-serum-anti-aging": "Vitamin C Serum - Anti-Aging & Wrinkles",
}

# ── Classify ─────────────────────────────────────────────────────────────────

group_keywords = defaultdict(list)

for item in all_kw:
    kw = item["keyword"]
    if is_competitor(kw):
        continue

    # Check Vitamin C first (before Ferulic which overlaps)
    vc_match = False
    for term in VC_MATCH_TERMS:
        if term in kw:
            slug = vc_subgroup(kw)
            group_keywords[slug].append(kw)
            vc_match = True
            break
    if vc_match:
        continue

    # Check remaining groups
    for slug, label, terms in GROUPS:
        matched = False
        for term in terms:
            if term in kw:
                group_keywords[slug].append(kw)
                matched = True
                break
        if matched:
            break

# ── Write CSVs ───────────────────────────────────────────────────────────────

out_dir = "keyword-research/processed/ad-groups"
os.makedirs(out_dir, exist_ok=True)

# All groups in display order
all_slugs = [g[0] for g in GROUPS[:3]]  # 01-02-03
all_slugs += ["04-vitamin-c-serum-core",
              "05-vitamin-c-serum-brightening-dark-spots",
              "06-vitamin-c-serum-anti-aging"]
all_slugs += [g[0] for g in GROUPS[3:]]   # 07 onward

slug_to_label = {g[0]: g[1] for g in GROUPS}
slug_to_label.update(VC_LABELS)

written = []
for slug in all_slugs:
    keywords = sorted(set(group_keywords[slug]))
    if not keywords:
        continue
    filename = f"{slug}.csv"
    path = os.path.join(out_dir, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Keyword"])
        for kw in keywords:
            writer.writerow([kw])
    written.append((slug, slug_to_label.get(slug, slug), len(keywords)))

# ── Summary ──────────────────────────────────────────────────────────────────

print(f"\nWrote {len(written)} CSV files to {out_dir}/\n")
print(f"{'File':<55} {'Label':<45} {'KWs':>5}")
print("-" * 110)
total = 0
for slug, label, count in written:
    print(f"{slug+'.csv':<55} {label:<45} {count:>5}")
    total += count
print("-" * 110)
print(f"{'TOTAL':<100} {total:>5}")

if _posthog:
    _posthog.capture(
        distinct_id=_DISTINCT_ID,
        event="keyword_csvs_exported",
        properties={
            "files_written": len(written),
            "total_keywords": total,
            "output_dir": out_dir,
        },
    )
