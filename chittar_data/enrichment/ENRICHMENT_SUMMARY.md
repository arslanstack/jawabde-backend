# Enrichment Summary

**Date:** 2026-06-12  
**Scope:** All 859 elected politicians (MNAs + MPAs) in the Jawab De database

---

## Coverage

| Metric | Count | % of 859 |
|--------|-------|----------|
| Politicians with any enrichment | 717 | 83.5% |
| Politicians with photos | 714 | 83.1% |
| Politicians with phone | 302 | 35.2% |
| Politicians with bio | 74 | 8.6% |
| Politicians with email | 57 | 6.6% |
| Politicians with Facebook URL | 62 | 7.2% |
| No data found | 142 | 16.5% |

---

## Sources

| Assembly | Site | Profiles | Method |
|----------|------|----------|--------|
| National Assembly (NA) | na.gov.pk | 178 | Puppeteer (profile pages) |
| Punjab Assembly (PP) | pap.gov.pk | 370 | axios+cheerio (profile pages) |
| Sindh Assembly (PS) | pas.gov.pk | 164 | axios+cheerio (single directory page) |
| KPK Assembly (PK) | pakp.gov.pk | 89 | axios+cheerio (profile pages) |
| Balochistan Assembly (PB) | bap.gov.pk | 50 | Puppeteer (profile pages) |
| **Total** | | **851** | |

---

## Matching

| Method | Count |
|--------|-------|
| By constituency code (exact) | 685 |
| By politician name (exact) | 21 |
| By politician name (fuzzy — strip titles + last 2 words) | 11 |
| **Total matched** | **717** |
| Unmatched (reserved seats, no constituency code) | 122 |

---

## Unmatched Politicians (142)

Politicians in the database with no scraped data:

- **88 NA members** — PTI-affiliated MNAs not present in the official NA UID source list (they appear on the NA website under a different system)
- **26 KPK seats** — gaps in KPK assembly listing
- **26 Sindh seats** — Sindh reserved seat members not scrapable from directory
- **1 Punjab seat** — single gap
- **1 Balochistan seat** — single gap

---

## Files Produced

| File | Description |
|------|-------------|
| `raw/kpk_profiles_raw.json` | 89 KPK scraped profiles |
| `raw/balochistan_profiles_raw.json` | 50 Balochistan scraped profiles |
| `raw/punjab_profiles_raw.json` | 370 Punjab scraped profiles |
| `raw/sindh_profiles_raw.json` | 164 Sindh scraped profiles |
| `raw/na_profiles_raw.json` | 178 NA scraped profiles |
| `enrichment_map.json` | Master map keyed by constituency code (717 entries) |
| `unmatched.json` | 122 scraped profiles with no DB match (reserved seats) |
| `no_data_found.json` | 142 DB politicians with no scraped data |

---

## Database Changes

Migration: `2026_06_12_101210_add_enrichment_fields_to_politicians_table`

Columns added to `politicians`:
- `bio` (text, nullable)
- `email` (varchar 150, nullable)
- `phone` (varchar 30, nullable)
- `facebook_url` (varchar 255, nullable)
- `twitter_handle` (varchar 100, nullable)
- `data_source` (varchar 100, nullable)

Command to re-run import: `php artisan enrich:politicians --photos`

Photos stored at: `storage/app/public/politicians/{politician_id}.{ext}`
