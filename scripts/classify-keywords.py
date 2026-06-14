"""
classify-keywords.py
Reads Google Ads keyword export and groups keywords by Roman Skin product category.
Outputs clean lists ready to paste into Google Ads Keyword Planner.
"""
import openpyxl
from collections import defaultdict

wb = openpyxl.load_workbook("keyword-research/raw/2026-04-25-google-ads-keyword-stats.xlsx")
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
data_rows = [r for r in rows[3:] if r[0] is not None]

# All keywords with avg monthly searches >= 500
all_kw = []
for r in data_rows:
    if r[2] and str(r[2]).replace(",", "").isdigit() and int(r[2].replace(",", "")) >= 500:
        all_kw.append({
            "keyword": r[0].lower().strip(),
            "vol": int(r[2].replace(",", "")),
            "comp": r[5] or "",
            "bid_hi": r[8] or "",
        })

# Competitor brand names — excluded from generic groups so we surface only conquerable terms
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
    for b in COMPETITOR_BRANDS:
        if b in kw:
            return True
    return False


# Ad groups: (group_name, product_label, [match_terms])
GROUPS = [
    (
        "Foaming Face Wash & Cleanser",
        "Balancing Foaming Cleanser with Green Tea & Rooibos",
        [
            "foaming face wash", "foaming cleanser", "foaming facial cleanser", "face wash",
            "facial cleanser", "foaming wash", "gentle foaming", "antioxidant cleanser",
            "fruit cleanser", "face cleanser", "facial wash", "daily cleanser",
            "cleanser for all skin", "foaming cream cleanser", "gel cleanser",
            "green tea cleanser", "rooibos cleanser",
        ],
    ),
    (
        "Cleansing Milk & Gentle Cleanser",
        "Gentle Cleansing Milk with Shea Butter for Sensitive Skin",
        [
            "cleansing milk", "gentle cleanser", "creamy cleanser", "cream cleanser",
            "milk cleanser", "sensitive skin cleanser", "non foaming cleanser",
            "non-foaming cleanser", "mild cleanser", "creamy facial", "makeup cleanser",
            "shea butter cleanser", "moisturizing cleanser",
        ],
    ),
    (
        "Toner & Hydrating Essence",
        "Gentle Botanical Toner + Hydrating Essence with Hyaluronic Acid",
        [
            "hyaluronic acid toner", "hydrating toner", "facial toner", "face toner",
            "hydrating essence", "essence toner", "toner for sensitive", "botanical toner",
            "gentle toner", "skin toner", "toning", "copper peptide toner",
            "hydrating lotion toner", "essence lotion",
        ],
    ),
    (
        "Vitamin C Serum",
        "Illuminating Vitamin C Serum with Ferulic Acid",
        [
            "vitamin c serum", "best vitamin c serum", "vitamin c brightening serum",
            "vitamin c antioxidant serum", "super c serum", "vitamin c for face",
            "vitamin c for skin", "vitamin c for dark spots", "vitamin c hyperpigmentation",
            "vitamin c brightening", "brightening serum", "illuminating serum",
            "ascorbic acid serum", "sodium ascorbyl", "vitamin ce", "vitamin c daily",
            "antioxidant serum", "kakadu plum serum", "astaxanthin serum",
            "vitamin c serum for face", "vitamin c serum benefits", "vit c serum",
            "vitamin c and hyaluronic acid serum", "vitamin c niacinamide",
            "vitamin c for hyperpigmentation", "vitamin c for pigmentation",
            "serum for brightening", "face brightening serum", "brightening face serum",
        ],
    ),
    (
        "Ferulic Acid & Pollution Defense Serum",
        "Rejuvenating Vitamin C & Ferulic Acid Serum",
        [
            "ferulic acid serum", "ferulic serum", "vitamin c ferulic", "ferulic acid",
            "vitamin c and ferulic", "ce ferulic", "c e ferulic", "phloretin",
            "vitamin c pollution", "pollution defense serum", "environmental serum",
            "malic acid serum", "resveratrol serum", "ferulic", "anti pollution serum",
        ],
    ),
    (
        "Hyaluronic Acid Serum",
        "Hydrating Hyaluronic Acid Serum with Vitamin E",
        [
            "hyaluronic acid serum", "hyaluronic serum", "ha serum", "hydrating serum",
            "moisture serum", "hydration serum", "hyaluronic acid facial serum",
            "hyaluronic acid for face", "hyaluronic acid skin", "vitamin e serum",
            "vitamin e face serum", "dehydrated skin serum", "plumping serum",
            "hyaluronic acid and vitamin e",
        ],
    ),
    (
        "Peptide Serum & Botanical Growth Factor",
        "Revitalizing Peptide Serum with Hyaluronic Acid",
        [
            "growth factor serum", "peptide serum", "botanical growth factor",
            "plant peptide serum", "anti-aging serum", "anti aging serum",
            "firming serum", "collagen serum", "revitalizing serum", "skin renewal serum",
            "fine line serum", "wrinkle serum", "age defying serum", "pro age serum",
            "neuropeptide serum", "oligopeptide", "sh-oligopeptide",
        ],
    ),
    (
        "Peptide Eye Cream",
        "Hyaluronic Acid Peptide Eye Creme - Anti-Aging",
        [
            "peptide eye cream", "eye cream", "hyaluronic acid eye cream", "eye creme",
            "collagen eye cream", "anti aging eye cream", "eye cream for wrinkles",
            "eye cream fine lines", "eye serum", "under eye cream", "eye treatment",
            "dark circle eye cream", "eye moisturizer", "eye contour",
        ],
    ),
    (
        "Eye Patches",
        "Pomegranate & Resveratrol Anti-Aging Eye Patches",
        [
            "eye patches", "eye mask", "eye gel patches", "under eye patches",
            "eye patch", "collagen eye patches", "anti aging eye patches",
            "hydrating eye patches", "resveratrol eye", "pomegranate eye",
            "gold eye patches", "under eye mask", "puffy eyes",
        ],
    ),
    (
        "Anti-Aging Moisturizer & Face Cream",
        "Multi-Peptide Anti-Aging Moisturizer with Hyaluronic Acid",
        [
            "anti aging moisturizer", "anti-aging moisturizer", "peptide moisturizer",
            "face moisturizer", "facial moisturizer", "face cream", "face lotion",
            "hyaluronic acid moisturizer", "moisturizer for aging", "moisturizer for dry skin",
            "best face moisturizer", "daily moisturizer", "multi peptide", "moisturizing cream",
            "aloe vera moisturizer", "hydrating moisturizer", "firming moisturizer",
            "anti wrinkle moisturizer", "anti aging face cream",
        ],
    ),
    (
        "Exfoliant & Chemical Peel",
        "Skin Renewal Peel with Glycolic Acid + Radiant Skin Enzyme Exfoliant",
        [
            "glycolic acid", "chemical peel", "face peel", "exfoliant", "exfoliator",
            "aha exfoliant", "alpha hydroxy acid", "fruit enzyme", "enzyme exfoliant",
            "face scrub", "skin renewal", "peel treatment", "exfoliating", "malic acid face",
            "pumpkin peel", "brightening exfoliant", "skin resurfacing", "lactic acid peel",
        ],
    ),
    (
        "Face Mask",
        "Luminous Mask with Blueberry Oil + Soothing Gel Mask",
        [
            "face mask", "facial mask", "hydrating mask", "gel mask",
            "brightening mask", "calming mask", "soothing mask", "hyaluronic acid mask",
            "vitamin c mask", "coq10 mask", "anti aging mask", "antioxidant mask",
            "blueberry mask", "skin mask",
        ],
    ),
]

# Classify
groups = defaultdict(list)
for item in all_kw:
    kw = item["keyword"]
    matched = False
    for group_name, product_label, terms in GROUPS:
        for term in terms:
            if term in kw:
                groups[group_name].append(item)
                matched = True
                break
        if matched:
            break

# Output
total_kw = 0
for group_name, product_label, terms in GROUPS:
    items = groups[group_name]
    # Split generic vs competitor
    generic = [i for i in items if not is_competitor(i["keyword"])]
    competitor = [i for i in items if is_competitor(i["keyword"])]

    # Dedupe and sort by vol
    seen = set()
    deduped_generic = []
    for i in sorted(generic, key=lambda x: x["vol"], reverse=True):
        if i["keyword"] not in seen:
            seen.add(i["keyword"])
            deduped_generic.append(i)

    seen = set()
    deduped_comp = []
    for i in sorted(competitor, key=lambda x: x["vol"], reverse=True):
        if i["keyword"] not in seen:
            seen.add(i["keyword"])
            deduped_comp.append(i)

    total_kw += len(deduped_generic)
    print(f"\n{'='*70}")
    print(f"AD GROUP: {group_name}")
    print(f"Product:  {product_label}")
    print(f"Keywords: {len(deduped_generic)} generic | {len(deduped_comp)} competitor")
    print(f"{'='*70}")
    print("-- GENERIC (paste these into Keyword Planner) --")
    for i in deduped_generic:
        print(f"  {i['keyword']}")
    if deduped_comp:
        print("-- COMPETITOR CONQUESTING (optional, bid separately) --")
        for i in deduped_comp[:10]:
            print(f"  {i['keyword']}")

print(f"\n\nTOTAL generic keywords across all groups: {total_kw}")
