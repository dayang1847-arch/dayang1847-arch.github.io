# Lighting Market Console — interactive demo

Public, buildless browser demo for DC Web. Open `./market-console/?lang=zh` or `?lang=en` from a static server. All script and asset references are relative, including in subdirectory previews. No dependencies, API keys or backend are required.

## What works

- Replay synthetic collection tasks across three markets, three product categories and three source labels. Start, pause, resume, end and restore a paused task after a reload.
- Archive and filter products. The initial workspace has all customer baselines and one peer per market/category; a replay adds the remaining relevant samples.
- Import CSV records, calculate per-product efficacy, compare medians and show valid data coverage. Records with the same ID are updated on import. Sample replay preserves imported records with matching IDs.
- Answer five planning questions. The selected numerical priority chooses an inspectable peer record as the reference; positioning, control, thermal and evidence choices become explicit design constraints.
- Export filtered products and report evidence as CSV, and download a Markdown planning brief. Copy the generated visual prompt.
- Switch Chinese/English and light/dark themes. The portfolio and demo preserve language links.

Collection replays the **36 fictional records** in `demo-data.js`. Brand names, model names, numerical values and source labels do not represent actual listings or market facts. No Amazon, Shopee, brand-site or DeepSeek requests are made. The recommendation is deterministic local calculation, not an AI response. Visual output is a text prompt, not a generated product image.

## Calculation rules

Customer baseline: all customer records in the selected category, across markets. Peer cohort: only the selected market and category. Imported and sample records can coexist; the UI and brief identify their provenance.

Medians exclude missing/invalid values. Efficacy is calculated as `lumens / powerW` for each record with positive power, then the median of those ratios is calculated. The displayed gap is `(peer median / customer median - 1) × 100`; a missing or nonpositive customer median yields no relative gap. Coverage reports valid and total records for both cohorts. Prices retain their currencies and are excluded from cross-market comparisons.

Reference priorities select the highest valid efficacy, highest output, or the record closest to peer medians by average relative distance over available metrics. All suggested numbers come from that single record. They are reference specifications, not a completed engineering design or verified cost, control, lifetime or certification claims.

## CSV import

Use **CSV template** to download an editable example. UTF-8 (with or without BOM), quoted commas, embedded newlines, escaped quotes and reordered columns are supported. All 14 headers are required:

```csv
id,brand,role,market,category,source,model,powerW,lumens,cctK,cri,ip,price,currency
```

| Field | Accepted values |
| --- | --- |
| `id`, `model` | Nonempty text, up to 240 characters; each ID unique within the import |
| `brand` | `customer`, `peer-a`, `peer-b` (comparison groups; use `model` for your product name) |
| `role` | `customer` for brand `customer`; `peer` for the other groups |
| `market` | `AU`, `VN`, `UK` |
| `category` | `floodlight`, `streetlight`, `highbay` |
| `source` | `amazon`, `shopee`, `brand` |
| `powerW`, `lumens`, `cctK`, `cri`, `price` | Nonnegative numbers, or blank for missing data; CRI at most 100 |
| `ip` | IP rating, such as `IP65`, `IP66`, or blank |
| `currency` | `AUD` for AU, `VND` for VN, `GBP` for UK |

Limits: 1 MB per file and 5,000 total workspace records. Imports are validated before any workspace update. CSV export includes a UTF-8 BOM for Excel and neutralizes spreadsheet formulas in text cells. CSV is not an `.xlsx` workbook.

## Local data

The workspace and collection checkpoint are saved under `dc-market-demo-v1` in the current browser's local storage. A running task resumes as paused after reloading. CSV data is not uploaded. Reports remain local downloads. Use **Reset demo data** (available on desktop and mobile) to remove imported records and restore the initial samples. If browser storage is unavailable, the current session still works.

## Maintenance and validation

- `index.html`: accessible application structure.
- `styles.css`: desktop/mobile layouts, themes and reduced-motion support.
- `demo-data.js`: explicitly fictional samples only.
- `engine.js`: calculations, cohort selection, CSV validation and export.
- `app.js`: translated interface, task replay, browser persistence and reports.
- `tests/engine.test.cjs`: dependency-free calculation and CSV tests.

From the repository root:

```sh
node --check main.js
node --check market-console/app.js
node --check market-console/engine.js
node --check market-console/demo-data.js
node --test market-console/tests/engine.test.cjs
python3 -m http.server 4173 --bind 127.0.0.1
```

Verify HTTP 200 for the entry page and its relative resources. Check task pause/resume and reload recovery, market/category isolation, imported data changing the calculations, reference selection, CSV/Markdown downloads, both languages, light/dark themes and mobile layouts. Publish only this demo's runtime files and documentation with the portfolio update; the private backend, business data and credentials are not part of this site.
