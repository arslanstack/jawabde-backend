# Jawab De — Mobile API Documentation

**Base URL:** `https://jawabde.test/api/v1`  
**Auth:** Laravel Sanctum — Bearer token. Obtain via `/auth/login` or `/auth/register`.  
**Format:** JSON. Always include `Accept: application/json` header.  
**Response envelope:** Single resources wrapped in `{ "data": {...} }`. Paginated lists wrapped in `{ "data": [...], "meta": {...} }`.

---

## Authentication

### POST `/auth/register`

Register a new mobile user.

**Request body (JSON):**

| Field | Type | Rules |
|---|---|---|
| `name` | string | optional, max 100 chars |
| `phone` | string | required, unique, Pakistani format: `03XXXXXXXXX` or `+92XXXXXXXXXX` |
| `password` | string | required, min 8 chars |
| `password_confirmation` | string | required, must match `password` |

**Processing:**
1. Validate input; reject if phone already registered.
2. Hash password with bcrypt.
3. Create `mobile_users` record.
4. Issue Sanctum token.

**Success (201):**
```json
{
  "token": "1|xxxxxxxxxxx",
  "user": { "id": "01k...", "name": "Ali Hassan", "phone": "03001234567" }
}
```

**Errors:**
- `422` — validation failure (phone format, duplicate phone, password mismatch)

---

### POST `/auth/login`

Authenticate and get a token.

**Request body (JSON):**

| Field | Type | Rules |
|---|---|---|
| `phone` | string | required |
| `password` | string | required |

**Processing:**
1. Find user by phone.
2. Verify password.
3. Check `is_active` — suspended users are blocked at this step.
4. Issue Sanctum token (old tokens are NOT revoked; user may be on multiple devices).

**Success (200):**
```json
{
  "token": "2|xxxxxxxxxxx",
  "user": { "id": "01k...", "name": "Ali Hassan", "phone": "03001234567" }
}
```

**Errors:**
- `401` — wrong phone or password
- `403` — `{ "message": "Account suspended." }` (admin has set `is_active = false`)

---

### POST `/auth/logout` *(protected)*

Revoke the current token.

**Headers:** `Authorization: Bearer {token}`

**Processing:** Deletes the specific token used in this request. Other tokens (other devices) remain valid.

**Success (200):**
```json
{ "message": "Logged out" }
```

---

### GET `/auth/me` *(protected)*

Get the authenticated user's profile.

**Success (200):**
```json
{
  "data": {
    "id": "01k...",
    "name": "Ali Hassan",
    "phone": "03001234567",
    "created_at": "2025-01-01T00:00:00.000Z",
    "total_complaints": 3
  }
}
```

---

### PUT `/auth/profile` *(protected)*

Update profile (currently only name).

**Request body (JSON):**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 100 chars |

**Success (200):** Updated user object (same shape as `/auth/me`).

**Errors:**
- `422` — validation failure

---

### POST `/auth/forgot-password`

Initiate password reset by generating a 6-digit OTP.

**Request body (JSON):**

| Field | Type |
|---|---|
| `phone` | string (required) |

**Processing:**
1. Find user by phone. If not found, still return a success response (prevents user enumeration).
2. Generate random 6-digit OTP.
3. Store OTP in `phone_otp` and set `phone_otp_expires_at` to 10 minutes from now.
4. **No SMS is sent** — OTP must be retrieved from the database during development/testing. Production SMS integration is pending.

**Success (200) — always returned, regardless of whether phone exists:**
```json
{ "message": "If this number is registered, an OTP has been sent." }
```

> **Development note:** To get the OTP for testing, query the database: `SELECT phone_otp FROM mobile_users WHERE phone = '030XXXXXXXX';`

---

### POST `/auth/verify-otp`

Check if the OTP is valid before allowing a password reset.

**Request body (JSON):**

| Field | Type |
|---|---|
| `phone` | string (required) |
| `otp` | string (required) |

**Processing:**
1. Find user by phone.
2. Check `phone_otp` matches and `phone_otp_expires_at` is in the future.

**Success (200):**
```json
{ "valid": true }
```

**Errors:**
- `422` — `{ "message": "Invalid or expired OTP" }`

---

### POST `/auth/reset-password`

Complete the password reset.

**Request body (JSON):**

| Field | Type | Rules |
|---|---|---|
| `phone` | string | required |
| `otp` | string | required |
| `password` | string | required, min 8 chars |
| `password_confirmation` | string | required, must match `password` |

**Processing:**
1. Verify OTP again (same check as `/auth/verify-otp`).
2. Update password (bcrypt hash).
3. Clear `phone_otp` and `phone_otp_expires_at` fields.
4. Delete **all** tokens for this user (forces re-login on all devices).

**Success (200):**
```json
{ "message": "Password reset successfully" }
```

**Errors:**
- `422` — OTP invalid/expired, or password validation failure

---

## Location

### POST `/locate`

Identify the district and current representatives for a GPS coordinate.

**Request body (JSON):**

| Field | Type | Rules |
|---|---|---|
| `lat` | float | required, must be 23–37 (Pakistan latitude range) |
| `lon` | float | required, must be 60–77 (Pakistan longitude range) |

**Processing:**
1. Validate coordinates are within Pakistan's bounding box.
2. Load GeoJSON boundaries (cached in memory after first call).
3. Run ray-casting point-in-polygon to find the matching district.
4. Look up the district in the database by `pcode`.
5. Load all active (is_current = true) terms for constituencies within that district.
6. Separate terms into MNAs (National Assembly) and MPAs (provincial assemblies).

**Success (200):**
```json
{
  "district": {
    "id": "01k...",
    "name": "Lahore",
    "province": "Punjab"
  },
  "mnas": [
    {
      "term_id": "01k...",
      "constituency_code": "NA-118",
      "constituency_name": "Lahore-II",
      "politician_id": "01k...",
      "politician_name": "Hamza Shahbaz",
      "party": "PML(N)",
      "photo_url": "https://jawabde.test/storage/politicians/mna_1234.jpg"
    }
  ],
  "mpas": [
    {
      "term_id": "01k...",
      "constituency_code": "PP-145",
      "constituency_name": "Lahore-XV",
      "politician_id": "01k...",
      "politician_name": "Example MPA",
      "party": "PML(N)",
      "photo_url": null
    }
  ]
}
```

**Errors:**
- `422` — coordinates outside Pakistan bounding box, or location not matched by any district polygon

> **Edge cases:** Some remote areas (mountain regions, border zones) may not match any polygon. The response will be 422 with `"Location not found within Pakistan"`. The app should prompt the user to select their district manually.

---

## Complaint Types

### GET `/complaint-types`

Fetch all active complaint type categories.

No auth required. No pagination — only 28 types maximum.

**Success (200):**
```json
{
  "data": [
    { "id": "01k...", "name": "Pothole", "slug": "pothole", "icon": "road" },
    { "id": "01k...", "name": "Street Light", "slug": "street-light", "icon": "lightbulb" }
  ]
}
```

Results are ordered by `sort_order` ascending. Inactive types are excluded.

---

## Districts

### GET `/districts`

Paginated list of all districts.

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `per_page` | 20 | Max 100 |
| `page` | 1 | |

**Success (200):**
```json
{
  "data": [
    {
      "id": "01k...",
      "name": "Lahore",
      "province": { "id": "01k...", "name": "Punjab", "code": "PB" },
      "center_lat": "31.5497000",
      "center_lon": "74.3436000"
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 160, "last_page": 8 }
}
```

---

### GET `/districts/{id}`

Single district detail.

**Success (200):**
```json
{
  "data": {
    "id": "01k...",
    "name": "Lahore",
    "pcode": "PK609",
    "division": "Lahore Division",
    "province": { "id": "01k...", "name": "Punjab", "code": "PB" },
    "center_lat": "31.5497000",
    "center_lon": "74.3436000"
  }
}
```

**Errors:**
- `404` — district not found

---

## Constituencies

### GET `/constituencies`

Paginated list.

**Query params:** `per_page` (default 20), `page`

**Success (200):**
```json
{
  "data": [
    {
      "id": "01k...",
      "code": "NA-118",
      "name": "Lahore-II",
      "type": { "id": "01k...", "name": "National Assembly", "short_code": "NA", "level": "national" },
      "district": { "id": "01k...", "name": "Lahore" },
      "current_term": {
        "id": "01k...",
        "politician": { "id": "01k...", "name": "Hamza Shahbaz", "party": "PML(N)", "photo_url": null }
      }
    }
  ],
  "meta": { ... }
}
```

---

### GET `/constituencies/{id}`

Single constituency with current term.

**Success (200):** Same shape as a single item above.

**Errors:**
- `404` — not found

---

## Politicians

### GET `/politicians`

Paginated list with optional filters.

**Query params:**

| Param | Example | Notes |
|---|---|---|
| `search` | `imran` | FULLTEXT search on name |
| `party` | `PTI` | Partial match (LIKE `%PTI%`) |
| `province` | `Punjab` | Filter by province name |
| `assembly` | `NA` or `PP` | Filter by constituency type short_code |
| `per_page` | `20` | Default 20, max 100 |
| `page` | `1` | |

**Processing:** Joins through `terms → constituencies → districts → provinces` when province/assembly filters are active. Only politicians with at least one current term are returned by these filters.

**Success (200):**
```json
{
  "data": [
    {
      "id": "01k...",
      "name": "Hamza Shahbaz",
      "party": "PML(N)",
      "photo_url": "https://jawabde.test/storage/politicians/mna_1234.jpg",
      "current_term": {
        "id": "01k...",
        "constituency_code": "NA-118",
        "constituency_name": "Lahore-II",
        "election_year": 2024,
        "chittar_count": 0
      }
    }
  ],
  "meta": { ... }
}
```

---

### GET `/politicians/{id}`

Full politician profile with stats.

**Success (200):**
```json
{
  "data": {
    "id": "01k...",
    "name": "Hamza Shahbaz",
    "party": "PML(N)",
    "photo_url": "https://...",
    "current_term": {
      "id": "01k...",
      "constituency_code": "NA-118",
      "constituency_name": "Lahore-II",
      "district": "Lahore",
      "province": "Punjab",
      "election_year": 2024,
      "chittar_count": 12
    },
    "total_chittars": 12,
    "complaint_stats": {
      "total": 12,
      "open": 8,
      "resolved": 3,
      "withdrawn": 1
    },
    "recent_complaints": [
      {
        "id": "01k...",
        "photo_url": "https://...",
        "description": "Large pothole near canal bridge",
        "district": "Lahore",
        "complaint_type": "Pothole",
        "created_at": "2025-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

> `recent_complaints` shows the last 10 open, non-unpublished complaints linked to this politician. **No user identity is exposed** in this response.

**Errors:**
- `404` — politician not found

---

## Search

### GET `/search`

On-type search across districts, constituencies, and politicians.

**Query params:**

| Param | Rules |
|---|---|
| `q` | required, min 2 characters |
| `limit` | per-type limit, default 5, max 20 |

**Processing:**
1. FULLTEXT search on `districts.name`, `constituencies.name`, `politicians.name`.
2. Also matches constituency codes by prefix (`NA-1` → matches `NA-118`, `NA-119`, etc.).
3. Designed for <200ms response on the mobile app's on-type search bar.
4. Never uses `LIKE '%keyword%'` (leading wildcard kills index usage).

**Success (200):**
```json
{
  "query": "lahore",
  "results": {
    "districts": [
      { "type": "district", "id": "01k...", "label": "Lahore, Punjab" }
    ],
    "constituencies": [
      {
        "type": "constituency",
        "id": "01k...",
        "label": "NA-118 — Lahore-II",
        "current_rep": "Hamza Shahbaz"
      }
    ],
    "politicians": [
      {
        "type": "politician",
        "id": "01k...",
        "label": "Hamza Shahbaz — NA-118",
        "photo_url": "https://..."
      }
    ]
  },
  "total": 11
}
```

**Errors:**
- `422` — `q` is missing or under 2 characters

---

## Stats

### GET `/stats/summary`

National snapshot. Cached for 5 minutes. Cache is busted when a new complaint is filed.

**Success (200):**
```json
{
  "total_complaints": 0,
  "total_chittars_sent": 0,
  "total_politicians": 859,
  "most_chittared_this_week": {
    "name": "Hamza Shahbaz",
    "count": 5,
    "constituency": "NA-118"
  },
  "most_active_district": {
    "name": "Lahore",
    "complaint_count": 8
  },
  "complaints_today": 0,
  "complaints_this_week": 0
}
```

---

### GET `/stats/leaderboard`

Ranked list of most-chittared politicians.

**Query params:**

| Param | Options | Default |
|---|---|---|
| `period` | `all`, `week`, `month` | `all` |
| `province` | province name | all |
| `assembly` | `NA`, `PP`, `PS`, `PK`, `PB` | all |
| `limit` | 1–50 | 20 |

**Processing:**
- `period=all`: reads `terms.chittar_count` directly (fast, indexed).
- `period=week` or `period=month`: aggregates `complaint_terms` → `complaints.created_at`, counting non-unpublished complaints. This is a live count from the pivot table, not the cached counter.

**Success (200):**
```json
{
  "data": [
    {
      "rank": 1,
      "politician_id": "01k...",
      "name": "Hamza Shahbaz",
      "party": "PML(N)",
      "photo_url": null,
      "constituency_code": "NA-118",
      "constituency_name": "Lahore-II",
      "chittar_count": 42
    }
  ],
  "meta": { ... }
}
```

---

### GET `/stats/district/{district_id}`

Complaint stats for a specific district.

**Success (200):**
```json
{
  "district": { "id": "01k...", "name": "Lahore", "province": "Punjab" },
  "total_complaints": 24,
  "top_politicians": [
    { "name": "Hamza Shahbaz", "constituency_code": "NA-118", "chittar_count": 12 }
  ],
  "recent_complaints": [
    {
      "id": "01k...",
      "photo_url": "https://...",
      "description": "Broken street light",
      "complaint_type": "Street Light",
      "status": "open",
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

> `top_politicians` shows the top 3 politicians by chittar count for this district. `recent_complaints` shows the last 10 non-unpublished complaints. No user identity exposed.

**Errors:**
- `404` — district not found

---

### GET `/stats/politician/{politician_id}`

Per-politician stats breakdown.

**Success (200):**
```json
{
  "politician": { "id": "01k...", "name": "Hamza Shahbaz", "party": "PML(N)" },
  "monthly_breakdown": [
    { "year": 2025, "month": 1, "count": 5 },
    { "year": 2024, "month": 12, "count": 3 }
  ],
  "complaint_type_breakdown": [
    { "type": "Pothole", "count": 7 },
    { "type": "Street Light", "count": 3 }
  ],
  "resolution_rate": 0.25
}
```

- `monthly_breakdown` covers the last 6 months.
- `resolution_rate` = resolved complaints / total complaints (0–1 float). Returns `null` if no complaints.

**Errors:**
- `404` — politician not found

---

## Complaints (Protected)

All endpoints below require `Authorization: Bearer {token}`.

---

### POST `/complaints`

File a new complaint (Chittar).

**Request format:** `multipart/form-data` (required — photo is a file upload).

| Field | Type | Rules |
|---|---|---|
| `photo` | file | required, JPG/PNG/WebP, max 10 MB |
| `description` | string | optional, max 1000 chars |
| `latitude` | decimal | required, e.g. `31.5497` |
| `longitude` | decimal | required, e.g. `74.3436` |
| `district_id` | ULID | required — must match an existing district |
| `complaint_type_id` | ULID | required — must be an active complaint type |
| `term_ids[]` | ULID array | required, 1–5 term IDs; all must be `is_current = true` and belong to the given district |

**Processing:**
1. Check user `is_active` — 403 if suspended.
2. Validate all fields.
3. Verify `complaint_type_id` is active.
4. Verify all `term_ids` are current and their constituencies belong to `district_id`.
5. **Rate limit check A:** Same user + same type + same 1.1km grid cell + same calendar day = blocked.
6. **Rate limit check B:** Same user + 5+ complaints today (any type/location) = blocked.
7. Store photo to `storage/app/public/complaints/`.
8. Insert `complaints` record.
9. Insert `complaint_terms` pivot rows.
10. Increment `chittar_count` on each affected term (`+1` per term).
11. Return the created complaint.

**Success (201):**
```json
{
  "data": {
    "id": "01k...",
    "status": "open",
    "description": "Large pothole near canal bridge",
    "latitude": "31.5497000",
    "longitude": "74.3436000",
    "photo_url": "https://...",
    "district": { "id": "01k...", "name": "Lahore" },
    "complaint_type": { "id": "01k...", "name": "Pothole" },
    "politicians": [
      { "name": "Hamza Shahbaz", "constituency_code": "NA-118" }
    ],
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `403` — account suspended
- `422` — validation failure
- `422` — `"You have already filed a complaint of this type at this location today."`
- `422` — `"Daily complaint limit reached. You can file up to 5 complaints per day."`

---

### GET `/complaints/mine`

List the authenticated user's own complaints, paginated, newest first.

**Query params:** `per_page` (default 20), `page`

Unpublished complaints are hidden (not returned). The user only sees their own complaints.

**Success (200):**
```json
{
  "data": [
    {
      "id": "01k...",
      "status": "open",
      "description": "Broken street light",
      "photo_url": "https://...",
      "complaint_type": { "name": "Street Light" },
      "district": { "name": "Lahore" },
      "politicians": [{ "name": "Hamza Shahbaz", "constituency_code": "NA-118" }],
      "created_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "meta": { ... }
}
```

---

### GET `/complaints/{id}`

Get a single complaint. User can only fetch their own.

**Errors:**
- `403` — complaint belongs to a different user
- `404` — complaint not found, or it's unpublished

---

### POST `/complaints/{id}/resolve`

Citizen marks their own complaint as resolved.

**Rules:**
- Must be the complaint owner.
- Complaint must currently be `open`. Cannot resolve a `withdrawn` or already-`resolved` complaint.

**Processing:** Sets `status = 'resolved'`, `resolved_at = now()`. Chittar count is **not** decremented — accountability stands even if the issue is fixed.

**Success (200):** Updated complaint object.

**Errors:**
- `403` — not the owner
- `422` — complaint is not in `open` status

---

### POST `/complaints/{id}/withdraw`

Citizen withdraws their own complaint (takes it back).

**Rules:**
- Must be the complaint owner.
- Complaint must currently be `open`.

**Processing:** Sets `status = 'withdrawn'`. Chittar count is **not** decremented.

**Success (200):** Updated complaint object.

**Errors:**
- `403` — not the owner
- `422` — complaint is not in `open` status

---

## Error Response Reference

| Code | When |
|---|---|
| `401` | Missing or invalid Sanctum token |
| `403` | Account suspended, or accessing another user's resource |
| `404` | Resource not found (or unpublished complaint) |
| `422` | Validation failure, rate limit hit, or invalid state transition |
| `429` | Too many requests (Laravel throttle: 60/min general, 10/min for `/locate`) |

**Validation error format:**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "phone": ["The phone field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

**All other errors:**
```json
{ "message": "Human-readable error message." }
```

---

## Rate Limits

| Endpoint group | Limit |
|---|---|
| All API endpoints | 60 requests / minute |
| `POST /locate` | 10 requests / minute |
| `POST /complaints` — same type + location + day | 1 per user |
| `POST /complaints` — daily cap | 5 per user across all types/locations |

Hitting Laravel's throttle returns `429 Too Many Requests` with a `Retry-After` header.

---

## Sample Mobile App Flow

### New user onboarding:
1. `POST /auth/register` → save token
2. `GET /complaint-types` → cache locally
3. `GET /stats/summary` → display on home screen

### Filing a Chittar:
1. User grants GPS permission
2. `POST /locate` with coordinates → show district + MNA/MPA list
3. User takes photo, writes description, selects type
4. `POST /complaints` (multipart) with `term_ids[]` from locate response
5. Show success + updated chittar count

### Browsing the leaderboard:
1. `GET /stats/leaderboard?period=week` → rank by recent activity
2. Tap politician → `GET /politicians/{id}` → show full profile + stats
3. `GET /stats/politician/{id}` → show monthly/type breakdown chart

### Password reset flow:
1. User enters phone → `POST /auth/forgot-password`
2. User receives OTP (SMS pending — use DB in dev) → `POST /auth/verify-otp`
3. On `{ "valid": true }` → show new password form → `POST /auth/reset-password`
4. Old tokens invalidated → redirect to login

---

## Test Users (Development)

| Name | Phone | Password |
|---|---|---|
| Ali Hassan | `03001234567` | `password` |
| Fatima Malik | `03121234567` | `password` |
| Usman Qureshi | `03331234567` | `password` |

Seed with: `php artisan db:seed --class=MobileUserSeeder`
