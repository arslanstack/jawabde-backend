# Jawab De — Admin Panel Build Report

**Platform:** Jawab De (جواب دے) — Pakistani Civic Accountability Platform  
**Stack:** Laravel 13 · Inertia.js · React · shadcn/ui · MySQL  
**Scope:** Admin Panel (web, session-based auth). Mobile API is a separate phase.

---

## 1. What Was Built

### 1.1 Database & Seeded Data

All 10 application tables are migrated and seeded.

| Table | Records | Notes |
|---|---|---|
| `provinces` | 7 | Punjab, Sindh, KP, Balochistan, Islamabad, AJK, GB |
| `districts` | 160 | Full Pakistan coverage, sourced from GeoJSON |
| `constituency_types` | 5 | NA, PP, PS, PK, PB |
| `constituencies` | 739 | NA + all provincial assemblies |
| `politicians` | 855 | MNAs + MPAs, with photos where available |
| `terms` | 738 | 2024 election, all marked `is_current = true` |
| `complaint_types` | 28 | Pothole → Other, ordered by `sort_order` |
| `complaints` | 0 | Empty; filled by mobile app users |
| `mobile_users` | 0 | Empty; registered via mobile app |
| `complaint_terms` | 0 | Pivot; filled when complaints are filed |

**Primary keys:** ULIDs on all tables (sortable, URL-safe, universally unique).  
**Schema features:** FULLTEXT indexes on `districts.name`, `constituencies.name`, `politicians.name`; virtual rounded-coordinate columns on `complaints` for rate-limit lookups; composite indexes for hot query paths.

### 1.2 Seeder Sources

All data sourced from `chittar_data/` at the project root:

```
chittar_data/
├── boundaries/
│   └── pakistan_districts_adm3.geojson   ← 160 districts + province mapping
├── politicians/
│   ├── mnas.json                          ← National Assembly members
│   └── all_mpas.json                      ← All provincial assembly members
├── photos/
│   └── mna_photo_map.json                 ← MNA photo filename mapping
└── district_politicians_map.json
```

Politician photos are stored at `storage/app/public/politicians/` and served via the `photo_url` appended attribute on the `Politician` model.

---

## 2. Authentication

| Layer | Mechanism | Users Table |
|---|---|---|
| Admin Panel | Laravel Breeze — session-based | `users` |
| Mobile API *(pending)* | Laravel Sanctum — token-based | `mobile_users` |

Admin auth is fully wired: login, logout, 2FA support (via Breeze), profile management, password change. All admin routes are protected by the `auth` middleware.

---

## 3. Admin Panel — Pages

### Navigation (Sidebar)

```
Dashboard
─────────────────────
Data Management
  Provinces
  Districts
  Constituency Types
  Constituencies
  Politicians
  Terms
─────────────────────
Activity
  Complaints
  Mobile Users
─────────────────────
[User avatar → Profile / Logout]
```

---

### 3.1 Dashboard  `/admin/dashboard`

Summary cards displaying:
- Total Complaints · Open · Resolved · Unpublished
- Total Chittars Sent (sum of all `term.chittar_count`)
- Registered Mobile Users
- Most Chittared Politician this week
- Most Active District this week
- Complaints today / this week / this month

---

### 3.2 Provinces  `/admin/provinces`

**Table columns:** Name · Code · District Count · Actions  
**Features:** Client-side search · Add / Edit (Dialog modal) · Delete with guard (blocks if districts exist)  
**Form fields:** Name, Code (2–5 chars, auto-uppercased)

---

### 3.3 Districts  `/admin/districts`

**Table columns:** Name · Province · Division · Pcode · Coordinates · Actions  
**Features:** Server-side search (debounced, searches name + pcode) · Paginated (50/page) · Add / Edit · Delete with guard (blocks if constituencies exist)  
**Form fields:** Name, Province *(searchable select)*, Pcode, Division, Center Latitude, Center Longitude  

---

### 3.4 Constituency Types  `/admin/constituency-types`

**Table columns:** Name · Short Code · Level (badge) · Constituency Count · Actions  
**Features:** Client-side search · Add / Edit · Delete with guard  
**Form fields:** Name, Short Code, Level *(searchable select: national / provincial)*

---

### 3.5 Constituencies  `/admin/constituencies`

**Table columns:** Code · Name · Type · District · Province · Current Rep · Actions  
**Features:** Server-side search (code + name) · Paginated · Add / Edit · Delete with guard  
**Form fields:** Code, Name, Assembly Type *(searchable select)*, District *(searchable select)*, **Current Seat Holder** *(optional, searchable select — auto-creates/updates term)*

> Setting "Current Seat Holder" on save will mark any prior current terms inactive and create/update a 2024 term linking the politician to this constituency.

---

### 3.6 Politicians  `/admin/politicians`

**Table columns:** Photo (avatar) · Name · Party · Seat · Chittars · Actions  
**Features:** Server-side search (name + party) · Paginated · Add / Edit with photo upload · Delete with guard  
**Form fields:** Full Name, Party, Photo *(JPG/PNG/WebP, max 2 MB, with live preview + remove button)*, **Current Seat / Constituency** *(optional, searchable select — auto-creates/updates term)*  
**Photo storage:** `storage/app/public/politicians/{filename}` — served via `photo_url` appended accessor

---

### 3.7 Terms  `/admin/terms`

**Table columns:** Politician · Constituency · Election Year · Current (badge) · Chittars · Actions  
**Features:** Server-side search · Paginated · Add / Edit · Delete with guard (blocks if complaints linked)  
**Form fields:** Politician *(searchable select)*, Constituency *(searchable select)*, Election Year, Is Current (checkbox)  
**Note:** Chittar Count is read-only; incremented only when a citizen files a complaint against that term.

---

### 3.8 Complaint Types  `/admin/complaint-types`

**Table columns:** Sort Order · Name · Slug · Icon · Status (inline toggle) · Actions  
**Features:** Client-side search · Add / Edit · Inline active/inactive toggle (no modal needed) · Delete  
**Form fields:** Name, Slug *(auto-generated from name, editable)*, Icon *(Lucide icon name for mobile app)*, Sort Order, Is Active  
**Seeded:** 28 types from Pothole to Other

---

### 3.9 Complaints  `/admin/complaints`

**Table columns:** ID (truncated ULID) · Type · District · Status (badge) · User Phone · Photo (thumbnail) · Date · Actions  
**Filters:** Status · District · Complaint Type · Date range (from/to) — all applied server-side  
**Row actions:**
- **View** → Detail dialog with full photo, map link, description, politicians chittared, status history
- **Status buttons** → Change to open / resolved / unpublished / withdrawn from the detail dialog
- **Delete** → AlertDialog confirm → hard deletes, decrements `chittar_count` on affected terms

**Admin CAN:** change status, delete (with chittar correction), unpublish  
**Admin CANNOT:** edit photo, description, location, or type (citizen records are immutable)

---

### 3.10 Mobile Users  `/admin/mobile-users`

**Table columns:** Name · Phone · Status (inline badge toggle) · Complaints Filed · Joined Date · Actions  
**Features:** Server-side search (phone + name) · Paginated · Inline suspend/reactivate · Delete (only if 0 complaints)  
**Detail page** (`/admin/mobile-users/{id}`): User info + paginated complaint history with status badges  

**Suspension behaviour:** Suspended users can still log in and view their own history; they cannot file new complaints (API returns 403).

---

## 4. Shared UI Patterns

### SearchableSelect Component
`resources/js/components/searchable-select.tsx`

Custom combobox used across all FK dropdown fields:
- Type to filter options in real time
- Keyboard navigation (↑ ↓ Enter Escape)
- Optional `creatable` prop: type a custom value + press Enter to use it
- Clear button (×) to deselect
- Used for: Province, District, Constituency Type, Assembly Type, Politician, Level, Constituency seat

### Form Dialogs
All create/edit forms open in a centered shadcn `Dialog` (not a slide-over Sheet):
- `sm:max-w-[420–520px]` depending on field count
- 2-column grid layouts where logical
- Consistent `Field` helper component: label + input + inline error
- Loading state on submit button

### Tables
All tables share:
- `divide-y` row separators, `hover:bg-muted/20` row highlight
- `min-w-*` on columns to prevent text wrapping
- `flex items-center justify-end gap-1` action cells (pencil + trash always side-by-side)
- Empty state row when no results
- Pagination controls with total record count

### Toast Notifications (Sonner)
All CRUD operations fire toasts via a `useAdminFlash()` hook that reads Laravel session flash messages inside a `useEffect` — preventing render-time side effects.

---

## 5. Services

### GeoJsonService
`app/Services/GeoJsonService.php`

- Loads `chittar_data/boundaries/pakistan_districts_adm3.geojson` once (static cache)
- Ray-casting point-in-polygon for both `Polygon` and `MultiPolygon` geometries
- Returns matching district properties (name, pcode, province) or `null`
- Registered as singleton in `AppServiceProvider`
- Used by the mobile API `LocateController` (Phase 3)

### SearchService
`app/Services/SearchService.php`

- FULLTEXT search across districts, constituencies, politicians
- Constituency code prefix matching (e.g. `NA-1` → `NA-118`, `NA-119`…)
- Returns typed, merged results with `label` field for display
- Target: <200ms for on-type search in mobile app

---

## 6. Models & Relationships

| Model | Key relationships |
|---|---|
| `Province` | hasMany Districts |
| `District` | belongsTo Province · hasMany Constituencies · hasMany Complaints |
| `ConstituencyType` | hasMany Constituencies |
| `Constituency` | belongsTo Type, District · hasMany Terms · hasOne currentTerm |
| `Politician` | hasMany Terms · hasOne currentTerm · appends `photo_url` |
| `Term` | belongsTo Politician, Constituency · belongsToMany Complaints (pivot) |
| `ComplaintType` | hasMany Complaints |
| `MobileUser` | hasMany Complaints |
| `Complaint` | belongsTo MobileUser, District, ComplaintType · belongsToMany Terms (pivot) |

All models use `HasUlids` trait — route model binding works automatically.

---

## 7. Admin Routes Summary

38 routes under `/admin/*`, all protected by session auth middleware.

| Route group | Endpoints |
|---|---|
| Dashboard | GET /admin/dashboard |
| Provinces | index, store, update, destroy |
| Districts | index, store, update, destroy |
| Constituency Types | index, store, update, destroy |
| Constituencies | index, store, update, destroy |
| Politicians | index, store, update, destroy |
| Terms | index, store, update, destroy |
| Complaint Types | index, store, update, destroy, toggle-active, reorder |
| Complaints | index, destroy, PATCH status |
| Mobile Users | index, show, toggle-active, destroy |

---

## 8. What Is NOT Yet Built

### Mobile API (Phase 3 — pending)
All API controllers, resources, and form requests are yet to be implemented:

- `AuthController` — register, login, logout, OTP password reset, profile
- `LocateController` — GPS → district + MNA/MPA lookup via GeoJsonService
- `ComplaintTypeController` — public list
- `DistrictController` / `ConstituencyController` / `PoliticianController`
- `ComplaintController` — file complaint, mine, resolve, withdraw (with rate limiting)
- `SearchController` — on-type search via SearchService
- `StatsController` — leaderboard, summary, district stats, politician stats

### Complaint Rate Limiting (API)
- Same type + same location (±1.1km grid) + same day → blocked
- Hard cap: 5 complaints per user per day

### Caching (Phase 4)
- `stats/summary` endpoint: 5-minute cache, busted on new complaint

### Image Resizing (Phase 4)
- Politician photos: max 400×400px on upload
- Complaint photos: max 1200px wide on upload

### Other out-of-scope items
- No public web frontend (planned Phase 2)
- No SMS/email delivery (endpoints exist, nothing sent)
- No push notifications
- No councillor (UC) data
- No AJK/GB assembly data (districts exist, no terms seeded)
- No complaint editing (citizen records are immutable by design)
- No photo moderation queue

---

## 9. File Structure (Key Files)

```
app/
├── Http/Controllers/Admin/
│   ├── DashboardController.php
│   ├── ProvinceController.php
│   ├── DistrictController.php
│   ├── ConstituencyTypeController.php
│   ├── ConstituencyController.php
│   ├── PoliticianController.php
│   ├── TermController.php
│   ├── ComplaintTypeController.php
│   ├── ComplaintController.php
│   └── MobileUserController.php
├── Models/
│   ├── Province.php · District.php · ConstituencyType.php
│   ├── Constituency.php · Politician.php · Term.php
│   ├── ComplaintType.php · Complaint.php · MobileUser.php
└── Services/
    ├── GeoJsonService.php
    └── SearchService.php

resources/js/
├── components/
│   ├── searchable-select.tsx       ← Custom searchable combobox
│   ├── app-sidebar.tsx             ← Admin sidebar navigation
│   └── ui/                         ← shadcn components
├── hooks/
│   └── use-admin-flash.ts          ← Safe flash → Sonner toast bridge
└── pages/admin/
    ├── dashboard/index.tsx
    ├── provinces/index.tsx
    ├── districts/index.tsx
    ├── constituency-types/index.tsx
    ├── constituencies/index.tsx
    ├── politicians/index.tsx
    ├── terms/index.tsx
    ├── complaint-types/index.tsx
    ├── complaints/index.tsx
    └── mobile-users/
        ├── index.tsx
        └── show.tsx

chittar_data/
├── boundaries/pakistan_districts_adm3.geojson
├── politicians/mnas.json · all_mpas.json
└── photos/mna_photo_map.json
```
