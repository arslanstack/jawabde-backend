# Politician Profile Enrichment — Jawab De
# Photos + Bio + Contact Data from 5 Official Assembly Websites

## Context

Jawab De is a Pakistani civic accountability platform with 859
politicians in its database (266 MNAs + 593 MPAs). We need to enrich
each politician record with photo, bio, email, phone, and Facebook URL
by scraping official government assembly websites.

All five websites have been verified as accessible and contain member
profile pages with the required data. Each site has different structure
and requires a different scraping approach as detailed below.

Install dependencies:
npm install puppeteer cheerio axios fs-extra

Global rules:
- 3 second delay between every HTTP request
- User-Agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
- Never overwrite an existing downloaded photo file (check before download)
- Save checkpoint after every 10 profiles (in case of interruption)
- If blocked mid-scrape, save checkpoint and exit gracefully
- Log all errors to: chittar_data/enrichment/errors.log
- All output to: chittar_data/enrichment/

Create directory structure upfront:
chittar_data/enrichment/
chittar_data/enrichment/photos/
chittar_data/enrichment/checkpoints/
chittar_data/enrichment/raw/

---

## ASSEMBLY 1 — KPK (pakp.gov.pk)
## Start here — easiest, fully static HTML, no Puppeteer needed

### Verified facts about this site:
- Members list: https://www.pakp.gov.pk/members/ — static HTML, all 115
  members on one page, no pagination
- Each member link format:
  https://www.pakp.gov.pk/members/{name-slug}-{pk-XX}-2024/
  Example: https://www.pakp.gov.pk/members/suriya-bibi-pk-01-2024/
- The constituency code is IN the URL slug: pk-01 = PK-1
- Profile pages are also static HTML — confirmed working

### Profile page confirmed fields (from live page inspection):
- Photo: img tag near member name at top of profile
- Name: h2 tag
- Constituency: h3 tag (e.g. "PK-1 Chitral Upper")
- Party: link with party name
- Bio: long text section titled "Personal Profile"
- Phone: labeled "Contact"
- Email: labeled "Email"
- Constituency Address: labeled "Constituency Address"
- Parliamentary career table with oath date, district, seat type, status

### Step 1: Scrape members list
Fetch https://www.pakp.gov.pk/members/ with axios + cheerio.
Extract all member links — href and link text.
From each href, extract constituency code:
  URL contains "-pk-01-" → code = "PK-1"
  URL contains "-pk-12-" → code = "PK-12"
  Regex: /-pk-(\d+)-/ → extract number → format as "PK-{number}"

Save to: chittar_data/enrichment/raw/kpk_member_list.json
Format: [{ "url": "https://...", "name": "Suriya Bibi", "code": "PK-1" }]

### Step 2: Scrape each profile page
For each member in kpk_member_list.json:
  - Check checkpoint: chittar_data/enrichment/checkpoints/kpk.json
    If this URL is in completed list, skip
  - Fetch the profile URL with axios
  - Parse with cheerio, extract all fields listed above
  - Download photo:
    Find img src near member name (not the logo/header images)
    If relative URL, prepend https://www.pakp.gov.pk
    Download to: chittar_data/enrichment/photos/kpk_{code_lowercase}.jpg
    e.g. kpk_pk-1.jpg
  - Append to checkpoint every 10 profiles

Save all extracted data to:
chittar_data/enrichment/raw/kpk_profiles_raw.json
Format: [{
  "code": "PK-1",
  "name": "Suriya Bibi",
  "photo_local": "chittar_data/enrichment/photos/kpk_pk-1.jpg",
  "photo_url": "https://www.pakp.gov.pk/...",
  "bio": "The first ever female member...",
  "email": "suriyabibi168@gmail.com",
  "phone": "03494281729",
  "address": "Mundagh P/O BONI...",
  "party": "Independents",
  "source": "pakp.gov.pk"
}]

Expected: 115 profiles

---

## ASSEMBLY 2 — Balochistan (pabalochistan.gov.pk)
## Requires Puppeteer — page loads via JavaScript

### Verified facts about this site:
- Members list: https://www.pabalochistan.gov.pk/list-members
  Loads via JS. Content IS present but needs browser rendering.
  Shows "Members 64" heading with tenure filter (select 2024-2029)
  Each member card contains: name, constituency (PB-1, PB-2...),
  district, party, and profile link /member-profile/{id}
  IDs seen in live page: 581, 586, 587, 588...
- Profile URL: https://www.pabalochistan.gov.pk/member-profile/{id}
  Confirmed working — profile 564 = Abdul Khaliq Khan Achakzai (PB-51)

### Profile page confirmed fields:
- Photo: img with src containing /storage/ path
- Name, constituency code, oath date, father name
- Email (often empty), party, phone (often empty), Facebook link

### Step 1: Get all member IDs from list page
Launch Puppeteer. Navigate to:
https://www.pabalochistan.gov.pk/list-members

Wait for member cards to load (waitForSelector for a member card element).
Make sure the 2024-2029 tenure is selected (it should be default).

Extract all member profile links — get the numeric ID from each href.
/member-profile/581 → id = 581

Also extract from each card:
- Member name
- Constituency code (PB-X)

Save to: chittar_data/enrichment/raw/balochistan_member_list.json
Format: [{ "id": 581, "name": "...", "code": "PB-1" }]

Expected: ~51 members (general seats) in 2024-2029 tenure.
Note: total shows 64-68 including reserved seats — only take
entries where constituency shows "PB-" prefix (general seats only).

### Step 2: Scrape each profile
For each ID, fetch:
https://www.pabalochistan.gov.pk/member-profile/{id}

With Puppeteer (same browser instance, navigate to each URL).
Extract:
- Photo: img src containing /storage/ — download it
- Name, constituency, oath date, father name, email, party, phone
- Facebook: look for facebook link in profile

Download photo to: chittar_data/enrichment/photos/balochistan_{id}.jpg

Save to: chittar_data/enrichment/raw/balochistan_profiles_raw.json
Same format as KPK but with id field instead of code
(constituency code comes from the list page data).

Expected: 51 general seat profiles

---

## ASSEMBLY 3 — Punjab (pap.gov.pk)
## Requires Puppeteer

### Known facts:
- Members list: https://www.pap.gov.pk/members/listing/en
- Paginated: 10 per page by default, can be increased
- URL to get 100 per page: https://www.pap.gov.pk/members/listing/en?limit=100
  Try this first — if it works, only 3 pages needed for 297 members
- Profile URL pattern: https://www.pap.gov.pk/members/profile/en/22/{id}
  Example: https://www.pap.gov.pk/members/profile/en/22/1948

### Step 1: Get all member IDs
Launch Puppeteer. Navigate to:
https://www.pap.gov.pk/members/listing/en?limit=100

Wait for member cards/rows to load.
Extract all profile links — get the numeric ID at the end of each URL.
Also extract name and any constituency info visible on the list page.

If per_page=100 doesn't work, paginate through pages manually.
Check for "next page" button, follow until all members extracted.

Save to: chittar_data/enrichment/raw/punjab_member_list.json
Format: [{ "id": "1948", "name": "...", "code": "PP-X" }]
(constituency code may not be on list page — that's okay, it's on profile)

Expected: 297 general seats (ignore reserved seat entries)

### Step 2: Scrape each profile
For each ID, navigate to:
https://www.pap.gov.pk/members/profile/en/22/{id}

Extract:
- Photo img src → download
- Name, constituency code (PP-X), party
- Bio / education text
- Email, phone if present
- Facebook, Twitter handles if present

Download photo to: chittar_data/enrichment/photos/punjab_{id}.jpg

Save to: chittar_data/enrichment/raw/punjab_profiles_raw.json

Expected: 297 profiles

---

## ASSEMBLY 4 — Sindh (pas.gov.pk)
## Requires Puppeteer

### Known facts:
- Members directory: https://pas.gov.pk/assembly-members-directory
- Profile URL pattern: https://pas.gov.pk/members/profile/33/{id}
  Example: https://pas.gov.pk/members/profile/33/870

### Step 1: Get all member IDs
Launch Puppeteer. Navigate to:
https://pas.gov.pk/assembly-members-directory

Wait for member list to load.
Extract all profile links and numeric IDs.
Also extract names and any constituency codes visible.

Save to: chittar_data/enrichment/raw/sindh_member_list.json
Expected: 130 general seat members

### Step 2: Scrape each profile
Navigate to: https://pas.gov.pk/members/profile/33/{id}
Extract same fields as above.
Download photo to: chittar_data/enrichment/photos/sindh_{id}.jpg
Save to: chittar_data/enrichment/raw/sindh_profiles_raw.json

Expected: 130 profiles

---

## ASSEMBLY 5 — National Assembly (na.gov.pk)
## Retry missing MNAs + get any remaining data

### Known facts:
- We already have 158/266 MNA photos from previous scrape
- Existing photo map: chittar_data/photos/mna_photo_map.json
- Existing photo UIDs: chittar_data/photos/mna_photo_urls.json
- Profile URL: https://na.gov.pk/en/profile.php?uid={uid}
- All members page: https://na.gov.pk/en/all-members.php

### Step 1: Find missing MNA UIDs
Read mna_photo_map.json — these 158 constituency codes already matched.
Read mnas.json — all 266 constituency codes.
Find the 108 constituency codes NOT in mna_photo_map.json.

Read mna_photo_urls.json — has raw name+uid pairs from the site.
For each of the 108 missing, try to match by name using:
1. Exact lowercase match
2. Strip titles (Syed, Mian, Chaudhry, Dr., Raja, Rana, Malik, Hafiz,
   Maulana, Sheikh, Sardar) then match
3. Match on last two words of name only

### Step 2: Scrape missing profiles with Puppeteer
For each newly matched UID plus any already-known UIDs that
don't have profile data yet:
Navigate to: https://na.gov.pk/en/profile.php?uid={uid}
Extract: photo URL, bio, email, phone, education
Download photo if not already in chittar_data/photos/

Save enrichment data to:
chittar_data/enrichment/raw/na_profiles_raw.json
Format: [{
  "uid": "1847",
  "code": "NA-X",
  "photo_local": "...",
  "bio": "...",
  "email": "...",
  "phone": "..."
}]

---

## TASK 6 — Build Master Enrichment Map

Read all five raw profile JSON files.
Read chittar_data/politicians/mnas.json and all_mpas.json.

Match each scraped profile to our politician records.

Matching priority (try in order, stop at first match):
1. CONSTITUENCY CODE MATCH — most reliable
   Scraped profile has "PK-1" or "PB-4" → match to that code in our data
   This should work for KPK (in URL), Balochistan (in card), Punjab/Sindh
   (on profile page)
2. EXACT NAME MATCH — lowercase trimmed
3. FUZZY NAME MATCH — strip titles, compare last 2 words

Build master map:
chittar_data/enrichment/enrichment_map.json

Format:
{
  "NA-1": {
    "photo_local_path": "chittar_data/enrichment/photos/na_1234.jpg",
    "bio": "...",
    "email": "...",
    "phone": "...",
    "facebook_url": "...",
    "source": "na.gov.pk",
    "match_method": "constituency_code"
  },
  "PK-1": {
    "photo_local_path": "chittar_data/enrichment/photos/kpk_pk-1.jpg",
    "bio": "The first ever female member...",
    "email": "suriyabibi168@gmail.com",
    "phone": "03494281729",
    "facebook_url": "",
    "source": "pakp.gov.pk",
    "match_method": "constituency_code"
  }
}

Unmatched scraped profiles → chittar_data/enrichment/unmatched.json
Our politicians with no data → chittar_data/enrichment/no_data_found.json

---

## TASK 7 — Laravel Migration + Import Command

### Migration
Check if politicians table has these columns. If not, create migration:
  bio              TEXT NULL
  email            VARCHAR(150) NULL
  phone            VARCHAR(30) NULL
  facebook_url     VARCHAR(255) NULL
  twitter_handle   VARCHAR(100) NULL  ← for future Twitter integration
  data_source      VARCHAR(100) NULL  ← which site data came from

Run: php artisan make:migration add_enrichment_fields_to_politicians_table
Then run: php artisan migrate

### Artisan command
php artisan enrich:politicians

Reads chittar_data/enrichment/enrichment_map.json

For each entry:
1. Find politician by constituency code:
   Term::where('is_current', true)
     ->whereHas('constituency', fn($q) => $q->where('code', $code))
     ->with('politician')
     ->first()
     ->politician

2. Photo import:
   - Only if politician.photo_path IS NULL
   - Copy from local path to storage/app/public/politicians/
   - Rename to {code_lowercase}.jpg e.g. pk-1.jpg, pb-4.jpg
   - Update politician.photo_path = 'politicians/pk-1.jpg'
   - Invalidate app_data_seed cache after all imports done:
     Cache::forget('app_data_seed')
     Cache::forget('app_data_version')

3. Bio: only set if politician.bio IS NULL and bio is non-empty string
4. Email: only set if politician.email IS NULL
5. Phone: only set if politician.phone IS NULL
6. Facebook: only set if politician.facebook_url IS NULL
7. data_source: always set (overwrite) to track where data came from

Print summary:
  Photos imported: X
  Bios imported: X
  Emails imported: X
  Phones imported: X
  Already had photo (skipped): X
  No match found: X

---

## TASK 8 — Summary Report

Save chittar_data/enrichment/ENRICHMENT_SUMMARY.md

# Politician Enrichment Summary

## Coverage

| Assembly | Total | Photos | Bio | Email | Phone | Facebook |
|----------|-------|--------|-----|-------|-------|----------|
| NA (na.gov.pk) | 266 | X | X | X | X | X |
| Punjab (pap.gov.pk) | 297 | X | X | X | X | X |
| Sindh (pas.gov.pk) | 130 | X | X | X | X | X |
| KPK (pakp.gov.pk) | 115 | X | X | X | X | X |
| Balochistan (pabalochistan.gov.pk) | 51 | X | X | X | X | X |
| **Total** | **859** | **X** | **X** | **X** | **X** | **X** |

## Match Method Breakdown
- Matched by constituency code: X
- Matched by exact name: X
- Matched by fuzzy name: X
- Unmatched (scraped but no DB match): X
- No data found (in DB but not scraped): X

## Files
- chittar_data/enrichment/enrichment_map.json
- chittar_data/enrichment/unmatched.json
- chittar_data/enrichment/no_data_found.json
- chittar_data/enrichment/errors.log