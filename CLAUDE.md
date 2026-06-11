# CLAUDE.md — Jawab De Backend
# Laravel 12 + Inertia.js + React — Admin Panel & Mobile API

---

## Project Overview

**Jawab De** (جواب دے) is a Pakistani civic accountability platform.
Citizens photograph local civic issues (potholes, broken streetlights, sewage
overflows, broken tubewells etc.), geotag them, and send "Chittars" (complaints)
to their elected representatives — their MNA (Member of National Assembly) and
MPA (Member of Provincial Assembly).

The name means "Answer Now" — a direct command from citizen to politician.
The core action is a "Chittar" (چھتر — slipper/shoe, classic desi slang for
a symbolic slap of accountability).

**What this project contains:**
- Admin panel (web, Inertia + React, admin-only) — manage all data
- Mobile REST API (Laravel Sanctum token auth) — serves the React Native app

**What this project does NOT contain:**
- The mobile app itself (separate React Native project)
- Any frontend for public users (web frontend is a future phase)

---

## Tech Stack

- **Framework:** Laravel 13
- **Admin UI:** Inertia.js + React (Laravel Breeze starter kit already installed)
- **Admin Components:** shadcn/ui throughout — DataTable, Dialog, Sheet, Badge,
  DropdownMenu, Select, Input, Button, Card, Avatar, Tabs, Skeleton
- **Admin Notifications:** Sonner toast for all CRUD feedback (success/error/warning)
- **Database:** MySQL
- **Auth (admin):** Laravel Breeze session-based (already implemented)
- **Auth (API):** Laravel Sanctum token-based
- **File storage:** Local
  — complaint photos → `storage/app/public/complaints/`
  — politician photos → `storage/app/public/politicians/`
- **Search:** MySQL FULLTEXT indexes (no Elasticsearch, no Algolia)
- **IDs:** ULIDs everywhere (not auto-increment integers, not UUIDs)
  — Use `Str::ulid()` for all primary keys
  — ULIDs are sortable by time, URL-safe, and universally unique
- **GeoJSON lookup:** PHP point-in-polygon on the GeoJSON file (no PostGIS)
  — File lives at `chittar_data/boundaries/pakistan_districts_adm3.geojson`
  — Load once, cache in Laravel config/memory

---

## Admin Panel — UI Rules

The admin panel uses the Breeze starter kit layout as the shell (sidebar,
topbar, auth pages). Strip out all default Laravel/Breeze placeholder content
— remove welcome text, generic dashboard cards, any demo components.

**Every page follows this pattern:**
- Page header: title + subtitle + primary action button (e.g. "Add Politician")
- shadcn DataTable with columns, sorting, pagination, and a search input
- Actions per row: Edit (opens Sheet/Dialog), Delete (confirm Dialog), plus
  any resource-specific actions (e.g. "Toggle Active", "View Photo")
- All create/edit forms open in a shadcn Sheet (slide-over panel) not a
  separate page — keeps context, feels modern
- Delete always shows a shadcn AlertDialog confirmation before proceeding
- All successful actions fire a Sonner toast: "Politician saved", "Complaint
  resolved", etc.
- All error responses fire a Sonner toast in destructive variant

**Sidebar navigation items (in order):**
- Dashboard
- separator: Data Management
- Provinces
- Districts
- Constituency Types
- Constituencies
- Politicians
- Terms
- separator: Activity
- Complaints
- Mobile Users
- separator: Account
- Profile (existing Breeze page)
- Logout

---

## ULID Usage Rules

Every table uses ULID as primary key. No auto-increment integers.

```php
// Migration pattern for every table:
$table->ulid('id')->primary();

// Model pattern for every model:
use Illuminate\Database\Eloquent\Concerns\HasUlids;
class Province extends Model {
    use HasUlids;
}
```

Foreign keys referencing ULIDs:
```php
$table->foreignUlid('province_id')->constrained()->cascadeOnDelete();
```

---

## Database Schema

Create migrations in this exact order (respects FK dependencies):

### 1. provinces

```php
Schema::create('provinces', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name', 100)->unique();        // Punjab, Sindh, etc.
    $table->string('code', 5)->unique();          // PB, SD, KP, BL, IS, AK, GB
    $table->timestamps();
});
```

### 2. districts

```php
Schema::create('districts', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('pcode', 10)->unique();        // e.g. PK609
    $table->string('name', 100);                  // e.g. Lahore
    $table->string('division', 100)->nullable();
    $table->foreignUlid('province_id')->constrained()->restrictOnDelete();
    $table->decimal('center_lat', 10, 7)->nullable();
    $table->decimal('center_lon', 10, 7)->nullable();
    $table->timestamps();

    $table->index('name');
    $table->index('province_id');
    $table->fullText('name', 'ft_districts_name');
});
```

### 3. constituency_types

```php
Schema::create('constituency_types', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name', 100)->unique();        // National Assembly, Punjab Assembly, etc.
    $table->string('short_code', 5)->unique();    // NA, PP, PS, PK, PB
    $table->enum('level', ['national', 'provincial']);
    $table->timestamps();
});
```

### 4. constituencies

```php
Schema::create('constituencies', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('code', 20)->unique();         // e.g. NA-118, PP-145
    $table->string('name', 100);                  // e.g. Lahore-II
    $table->foreignUlid('type_id')->constrained('constituency_types')->restrictOnDelete();
    $table->foreignUlid('district_id')->constrained()->restrictOnDelete();
    $table->timestamps();

    $table->index('district_id');
    $table->index('type_id');
    $table->index('code');
    $table->fullText('name', 'ft_constituencies_name');
});
```

### 5. politicians

```php
Schema::create('politicians', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name', 150);
    $table->string('party', 100)->nullable();
    $table->string('photo_path', 255)->nullable();
    $table->timestamps();

    $table->index('name');
    $table->index('party');
    $table->fullText('name', 'ft_politicians_name');
});
```

### 6. terms

```php
Schema::create('terms', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->foreignUlid('politician_id')->constrained()->restrictOnDelete();
    $table->foreignUlid('constituency_id')->constrained()->restrictOnDelete();
    $table->year('election_year');
    $table->boolean('is_current')->default(true);
    $table->unsignedBigInteger('chittar_count')->default(0);
    $table->timestamps();

    $table->unique(['constituency_id', 'election_year']);
    $table->index('politician_id');
    $table->index('is_current');
    $table->index(['is_current', 'chittar_count']);
    $table->index(['constituency_id', 'is_current']);
});
```

### 7. complaint_types

```php
Schema::create('complaint_types', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name', 100)->unique();        // e.g. Pothole, Street Light
    $table->string('slug', 100)->unique();        // e.g. pothole, street-light
    $table->string('icon', 50)->nullable();       // icon name for mobile app
    $table->boolean('is_active')->default(true);
    $table->unsignedSmallInteger('sort_order')->default(0);
    $table->timestamps();

    $table->index('is_active');
    $table->index('sort_order');
});
```

### 8. users (mobile app users)

```php
Schema::create('users', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->string('name', 100)->nullable();
    $table->string('phone', 20)->unique();
    $table->string('password');
    $table->boolean('is_active')->default(true);  // admin can ban
    $table->string('email')->nullable()->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('phone_otp', 10)->nullable();
    $table->timestamp('phone_otp_expires_at')->nullable();
    $table->rememberToken();
    $table->timestamps();

    $table->index('phone');
    $table->index('is_active');
});
```

### 9. complaints

```php
Schema::create('complaints', function (Blueprint $table) {
    $table->ulid('id')->primary();
    $table->foreignUlid('user_id')->constrained()->restrictOnDelete();
    $table->foreignUlid('district_id')->constrained()->restrictOnDelete();
    $table->foreignUlid('complaint_type_id')->constrained('complaint_types')->restrictOnDelete();
    $table->string('photo_path', 255);
    $table->text('description')->nullable();
    $table->decimal('latitude', 10, 7);
    $table->decimal('longitude', 10, 7);
    // Rounded coordinates for rate limiting (2 decimal places ≈ 1.1km grid)
    $table->decimal('latitude_rounded', 7, 2)->virtualAs('ROUND(latitude, 2)');
    $table->decimal('longitude_rounded', 7, 2)->virtualAs('ROUND(longitude, 2)');
    $table->enum('status', ['open', 'resolved', 'withdrawn', 'unpublished'])->default('open');
    $table->timestamp('resolved_at')->nullable();
    $table->timestamps();

    $table->index('user_id');
    $table->index('district_id');
    $table->index('complaint_type_id');
    $table->index('status');
    $table->index('created_at');
    $table->index(['district_id', 'status']);
    $table->index(['user_id', 'created_at']);
    // Composite index for rate limit check:
    $table->index(['user_id', 'complaint_type_id', 'latitude_rounded', 'longitude_rounded']);
});
```

### 10. complaint_terms (pivot)

```php
Schema::create('complaint_terms', function (Blueprint $table) {
    $table->foreignUlid('complaint_id')->constrained()->cascadeOnDelete();
    $table->foreignUlid('term_id')->constrained()->restrictOnDelete();
    $table->primary(['complaint_id', 'term_id']);

    $table->index('term_id');
    $table->index('complaint_id');
});
```

---

## Complaint Types — Seed Data

Seed these 28 types in `ComplaintTypeSeeder`. All are active by default.
The "Other" type must always be last (highest sort_order).

```php
$types = [
    ['name' => 'Pothole',              'slug' => 'pothole',            'icon' => 'road',          'sort_order' => 1],
    ['name' => 'Street Light',         'slug' => 'street-light',       'icon' => 'lightbulb',     'sort_order' => 2],
    ['name' => 'Sewage Overflow',      'slug' => 'sewage-overflow',    'icon' => 'droplets',      'sort_order' => 3],
    ['name' => 'Garbage Collection',   'slug' => 'garbage-collection', 'icon' => 'trash',         'sort_order' => 4],
    ['name' => 'Water Supply',         'slug' => 'water-supply',       'icon' => 'waves',         'sort_order' => 5],
    ['name' => 'Tubewell / Handpump',  'slug' => 'tubewell',          'icon' => 'droplet',       'sort_order' => 6],
    ['name' => 'Filtration Plant',     'slug' => 'filtration-plant',   'icon' => 'filter',        'sort_order' => 7],
    ['name' => 'Road Damage',          'slug' => 'road-damage',        'icon' => 'construction',  'sort_order' => 8],
    ['name' => 'Footpath / Pavement',  'slug' => 'footpath',          'icon' => 'footprints',    'sort_order' => 9],
    ['name' => 'Overhead Bridge',      'slug' => 'overhead-bridge',    'icon' => 'bridge',        'sort_order' => 10],
    ['name' => 'Park / Green Area',    'slug' => 'park',              'icon' => 'trees',         'sort_order' => 11],
    ['name' => 'Playground',           'slug' => 'playground',         'icon' => 'gamepad',       'sort_order' => 12],
    ['name' => 'Graveyard',            'slug' => 'graveyard',         'icon' => 'landmark',      'sort_order' => 13],
    ['name' => 'Encroachment',         'slug' => 'encroachment',       'icon' => 'fence',         'sort_order' => 14],
    ['name' => 'Stray Animals',        'slug' => 'stray-animals',      'icon' => 'paw-print',     'sort_order' => 15],
    ['name' => 'Security / Crime',     'slug' => 'security',          'icon' => 'shield-alert',  'sort_order' => 16],
    ['name' => 'Drug Activity',        'slug' => 'drug-activity',      'icon' => 'alert-triangle','sort_order' => 17],
    ['name' => 'Illegal Construction', 'slug' => 'illegal-construction','icon' => 'hammer',       'sort_order' => 18],
    ['name' => 'School Issue',         'slug' => 'school',            'icon' => 'school',        'sort_order' => 19],
    ['name' => 'Hospital / Clinic',    'slug' => 'hospital',          'icon' => 'hospital',      'sort_order' => 20],
    ['name' => 'Electricity Outage',   'slug' => 'electricity',        'icon' => 'zap-off',       'sort_order' => 21],
    ['name' => 'Gas Supply',           'slug' => 'gas-supply',         'icon' => 'flame',         'sort_order' => 22],
    ['name' => 'Public Toilet',        'slug' => 'public-toilet',      'icon' => 'building',      'sort_order' => 23],
    ['name' => 'Noise Pollution',      'slug' => 'noise',             'icon' => 'volume-x',      'sort_order' => 24],
    ['name' => 'Air Pollution',        'slug' => 'air-pollution',      'icon' => 'wind',          'sort_order' => 25],
    ['name' => 'Waterlogging',         'slug' => 'waterlogging',       'icon' => 'flood',         'sort_order' => 26],
    ['name' => 'Missing Manhole',      'slug' => 'manhole',           'icon' => 'circle-dashed', 'sort_order' => 27],
    ['name' => 'Other',                'slug' => 'other',             'icon' => 'more-horizontal','sort_order' => 99],
];
```

---

## Rate Limiting — Complaint Spam Prevention

A user cannot file more than one complaint of the **same type** at the
**same approximate location** on the **same calendar day**.

"Approximate location" = rounded to 2 decimal places (≈ 1.1km grid cell).
This prevents political workers from flooding the system against a
specific politician by filing 100 pothole reports at the same spot.

**Check in ComplaintController@store before saving:**

```php
$existingToday = Complaint::where('user_id', $user->id)
    ->where('complaint_type_id', $request->complaint_type_id)
    ->whereDate('created_at', today())
    ->whereRaw('ROUND(latitude, 2) = ?', [round($request->latitude, 2)])
    ->whereRaw('ROUND(longitude, 2) = ?', [round($request->longitude, 2)])
    ->whereNotIn('status', ['withdrawn'])
    ->exists();

if ($existingToday) {
    return response()->json([
        'message' => 'You have already filed a complaint of this type at this location today.'
    ], 422);
}
```

Additionally: a user cannot file more than **5 complaints total per day**
across any location/type. Hard cap.

```php
$dailyCount = Complaint::where('user_id', $user->id)
    ->whereDate('created_at', today())
    ->whereNotIn('status', ['withdrawn'])
    ->count();

if ($dailyCount >= 5) {
    return response()->json([
        'message' => 'Daily complaint limit reached. You can file up to 5 complaints per day.'
    ], 422);
}
```

---

## Models

Create Eloquent models for all 10 tables.
Every model must:
1. Use `HasUlids` trait
2. Define `$fillable` array
3. Define relationships

Key relationships:

**Province:** `hasMany(District::class)`

**District:** `belongsTo(Province::class)`, `hasMany(Constituency::class)`,
`hasMany(Complaint::class)`

**ConstituencyType:** `hasMany(Constituency::class)`

**Constituency:** `belongsTo(ConstituencyType::class)`,
`belongsTo(District::class)`, `hasMany(Term::class)`,
`hasOne(Term::class)->where('is_current', true)->latestOfMany()` as `currentTerm()`

**Politician:** `hasMany(Term::class)`,
`hasOne(Term::class)->where('is_current', true)->latestOfMany()` as `currentTerm()`

**Term:** `belongsTo(Politician::class)`, `belongsTo(Constituency::class)`,
`belongsToMany(Complaint::class, 'complaint_terms')`

**ComplaintType:** `hasMany(Complaint::class)`

**User:** `hasMany(Complaint::class)`

**Complaint:** `belongsTo(User::class)`, `belongsTo(District::class)`,
`belongsTo(ComplaintType::class)`,
`belongsToMany(Term::class, 'complaint_terms')`

---

## Seeders

### Data Location

All source data lives in `chittar_data/` at the project root:
```
chittar_data/
├── boundaries/
│   └── pakistan_districts_adm3.geojson
├── politicians/
│   ├── mnas.json
│   └── all_mpas.json
├── photos/
│   └── mna_photo_map.json
└── district_politicians_map.json
```

### GeoJSON property names:
- `adm2_name` → district name
- `adm2_pcode` → pcode
- `adm1_name` → province name
- `center_lat`, `center_lon` → centroid

### Seeder call order in DatabaseSeeder:
```php
$this->call([
    ProvinceSeeder::class,
    DistrictSeeder::class,
    ConstituencyTypeSeeder::class,
    ConstituencySeeder::class,
    ComplaintTypeSeeder::class,
    PoliticianSeeder::class,
    TermSeeder::class,
]);
```

### ProvinceSeeder
```php
$provinces = [
    ['name' => 'Punjab',             'code' => 'PB'],
    ['name' => 'Sindh',              'code' => 'SD'],
    ['name' => 'Khyber Pakhtunkhwa','code' => 'KP'],
    ['name' => 'Balochistan',        'code' => 'BL'],
    ['name' => 'Islamabad',          'code' => 'IS'],
    ['name' => 'Azad Kashmir',       'code' => 'AK'],
    ['name' => 'Gilgit Baltistan',   'code' => 'GB'],
];
```

### DistrictSeeder
Read `chittar_data/boundaries/pakistan_districts_adm3.geojson`.
Parse each feature: `adm2_name` → name, `adm2_pcode` → pcode,
`adm1_name` → look up province_id, `center_lat`/`center_lon` → store as-is.
160 districts expected.

### ConstituencyTypeSeeder
```php
$types = [
    ['name' => 'National Assembly',           'short_code' => 'NA', 'level' => 'national'],
    ['name' => 'Punjab Assembly',             'short_code' => 'PP', 'level' => 'provincial'],
    ['name' => 'Sindh Assembly',              'short_code' => 'PS', 'level' => 'provincial'],
    ['name' => 'Khyber Pakhtunkhwa Assembly', 'short_code' => 'PK', 'level' => 'provincial'],
    ['name' => 'Balochistan Assembly',        'short_code' => 'PB', 'level' => 'provincial'],
];
```

### ConstituencySeeder
Read `mnas.json` and `all_mpas.json`. For each entry:
- Infer type_id from constituency_code prefix (NA-/PP-/PS-/PK-/PB-)
- Look up district_id by district name
- Use `updateOrCreate(['code' => $code], [...])`
- Log and skip if district not found
859 constituencies expected.

### ComplaintTypeSeeder
Seed all 28 types defined in the Complaint Types section above.

### PoliticianSeeder
Read `mnas.json` and `all_mpas.json`.
Create one politician per unique member_name.
After creating all politicians, read `mna_photo_map.json`,
copy photos to `storage/app/public/politicians/` and update photo_path.
Skip entries where member_name is "Vacant" or empty.

### TermSeeder
Read `mnas.json` and `all_mpas.json`.
Match constituency_code → constituency, member_name → politician.
Create term with election_year = 2024, is_current = true.
Skip "Vacant" entries.
859 terms expected.

---

## Services

### GeoJsonService
`app/Services/GeoJsonService.php`

Loads `chittar_data/boundaries/pakistan_districts_adm3.geojson` once
(static property cache). Provides:
`findDistrict(float $lat, float $lon): ?array`

- Uses ray casting point-in-polygon algorithm
- Handles both Polygon and MultiPolygon geometry types
- Returns matching feature properties or null
- Register as singleton in AppServiceProvider

### SearchService
`app/Services/SearchService.php`

`search(string $query, int $limit = 5): array`

Runs FULLTEXT queries across districts, constituencies, politicians.
Also matches constituency codes by prefix (e.g. "NA-1" matches "NA-118").
Returns merged array with typed results, each having a `label` field for
display and all IDs needed for navigation.
Designed for on-type search — must respond under 200ms.
Never use LIKE with leading wildcard.

---

## Admin Panel — Pages & Features

### Layout
Use Breeze starter kit shell. Remove all default placeholder content.
Add the sidebar navigation as specified in UI Rules section.
Sidebar uses shadcn navigation components.

### Dashboard `/admin/dashboard`
Cards row (shadcn Card):
- Total Complaints | Open | Resolved | Unpublished
- Total Chittars Sent (sum of all term chittar_counts)
- Registered Mobile Users
- Most Chittared Politician this week (name + count + constituency)
- Most Active District this week (name + complaint count)
- Complaints today / this week / this month

### Provinces `/admin/provinces`
DataTable columns: Name, Code, Districts Count, Actions
Sheet form fields: Name, Code
No delete if province has districts (show error toast).

### Districts `/admin/districts`
DataTable columns: Name, Province, Division, Pcode, Lat/Lon, Actions
Filter by province (Select dropdown above table)
Sheet form fields: Name, Province (Select), Division, Pcode, Lat, Lon

### Constituency Types `/admin/constituency-types`
DataTable columns: Name, Short Code, Level, Constituencies Count, Actions
Sheet form fields: Name, Short Code, Level (Select: national/provincial)

### Constituencies `/admin/constituencies`
DataTable columns: Code, Name, Type, District, Province, Current Rep, Actions
Filters: Type (Select), Province (Select), District (Select, filtered by province)
Sheet form fields: Code, Name, Type, District
"Current Rep" column shows politician name from current term (read-only, linked to Terms)

### Politicians `/admin/politicians`
DataTable columns: Photo (Avatar), Name, Party, Current Constituency, Chittar Count, Actions
Search input above table (searches name)
Filter by party, province, assembly type
Sheet form fields: Name, Party, Photo upload (with preview)
Photo upload: accept jpg/png/webp, max 2MB, preview shown immediately on select
"Remove Photo" button clears photo_path and deletes file

### Terms `/admin/terms`
DataTable columns: Politician, Constituency, Election Year, Is Current (Badge), Chittar Count, Actions
Filters: Is Current (toggle), Assembly Type, Province
Sheet form fields: Politician (searchable Select), Constituency (searchable Select),
Election Year, Is Current (Switch)
Note: Chittar Count is read-only — shown in table but not editable

### Complaint Types `/admin/complaint-types`
DataTable columns: Sort Order, Name, Slug, Icon, Active (Badge), Actions
Row dragging to reorder (updates sort_order) — use dnd-kit
Sheet form fields: Name, Slug (auto-generated from name, editable), Icon, Is Active (Switch)
Toggle active/inactive per row without opening sheet (inline action)

### Complaints `/admin/complaints`
DataTable columns: ID (truncated ULID), Type (Badge), District, Status (Badge),
User Phone, Photo (thumbnail), Description (truncated), Chittared Politicians, Date, Actions

Filters above table:
- Status (Select: all/open/resolved/withdrawn/unpublished)
- District (Select)
- Complaint Type (Select)
- Date range (two date inputs: from/to)

Row actions:
- View (opens Show Dialog — full detail)
- Resolve (sets status = resolved, fires chittar count stays)
- Unpublish (sets status = unpublished, hides from public API)
- Re-publish (sets unpublished → open)
- Delete (AlertDialog confirm — hard deletes, cascades to complaint_terms,
  decrements chittar_count on affected terms)

Complaint Show Dialog contains:
- Full-size photo (click to open in new tab)
- Map link (Google Maps link using lat/lon)
- All fields displayed cleanly
- List of politicians chittared with their constituency codes
- Status history (created_at, resolved_at if set)
- User info: phone number (no name for privacy in display)

Admin CAN:
- Change status to any value
- Hard delete a complaint (with chittar_count correction)
- Unpublish (removes from public API without deleting)

Admin CANNOT:
- Edit the photo, description, location, or type of a complaint
  (complaints are citizen records, not admin records)

### Mobile Users `/admin/users`
DataTable columns: Name, Phone, Active (Badge), Complaints Filed, Joined Date, Actions

Row actions:
- View (Show Sheet with complaint history)
- Toggle Active/Inactive (inline — no confirmation needed, reversible)
- Delete (AlertDialog confirm — only if user has zero complaints)

User Show Sheet contains:
- User details
- Paginated list of their complaints (last 20) with status badges
- Total complaints filed
- "Suspend / Reactivate" button

When a user is set inactive (suspended):
- Their existing complaints remain visible
- They cannot file new complaints (API returns 403 with message
  "Your account has been suspended. Contact support.")
- They can still log in and view their own history

---

## Mobile API

### API Routes
All in `routes/api.php`, prefix `/api/v1/`.

```php
Route::prefix('v1')->group(function () {

    // Auth
    Route::post('auth/register',         [AuthController::class, 'register']);
    Route::post('auth/login',            [AuthController::class, 'login']);
    Route::post('auth/forgot-password',  [AuthController::class, 'forgotPassword']);
    Route::post('auth/verify-otp',       [AuthController::class, 'verifyOtp']);
    Route::post('auth/reset-password',   [AuthController::class, 'resetPassword']);

    // Public data
    Route::post('locate',                        [LocateController::class, 'locate']);
    Route::get('complaint-types',                [ComplaintTypeController::class, 'index']);
    Route::get('districts',                      [DistrictController::class, 'index']);
    Route::get('districts/{district}',           [DistrictController::class, 'show']);
    Route::get('constituencies',                 [ConstituencyController::class, 'index']);
    Route::get('constituencies/{constituency}',  [ConstituencyController::class, 'show']);
    Route::get('politicians',                    [PoliticianController::class, 'index']);
    Route::get('politicians/{politician}',       [PoliticianController::class, 'show']);
    Route::get('search',                         [SearchController::class, 'search']);
    Route::get('stats/leaderboard',              [StatsController::class, 'leaderboard']);
    Route::get('stats/summary',                  [StatsController::class, 'summary']);
    Route::get('stats/district/{district}',      [StatsController::class, 'district']);
    Route::get('stats/politician/{politician}',  [StatsController::class, 'politician']);

    // Protected
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout',                    [AuthController::class, 'logout']);
        Route::get('auth/me',                         [AuthController::class, 'me']);
        Route::put('auth/profile',                    [AuthController::class, 'updateProfile']);
        Route::post('complaints',                     [ComplaintController::class, 'store']);
        Route::get('complaints/mine',                 [ComplaintController::class, 'mine']);
        Route::get('complaints/{complaint}',          [ComplaintController::class, 'show']);
        Route::post('complaints/{complaint}/resolve', [ComplaintController::class, 'resolve']);
        Route::post('complaints/{complaint}/withdraw',[ComplaintController::class, 'withdraw']);
    });
});
```

---

## API Controllers — Detailed Specs

### AuthController

**POST /api/v1/auth/register**
Request: `{ name, phone, password, password_confirmation }`
Validation:
- `phone`: required, unique, Pakistani format regex `/^(\+92|0)[0-9]{10}$/`
- `password`: min 8 chars, confirmed
Response: `{ token, user: { id, name, phone } }`

**POST /api/v1/auth/login**
Request: `{ phone, password }`
Check `is_active` — if false return `403 { "message": "Account suspended." }`
Response: `{ token, user: { id, name, phone } }`

**POST /api/v1/auth/logout**
Delete current access token.
Response: `{ "message": "Logged out" }`

**POST /api/v1/auth/forgot-password**
Find user by phone. Generate 6-digit OTP. Store in `phone_otp` and
`phone_otp_expires_at` (10 minutes from now). Do NOT send SMS (not implemented).
Response always: `{ "message": "If this number is registered, an OTP has been sent." }`

**POST /api/v1/auth/verify-otp**
Request: `{ phone, otp }`
Check OTP matches and `phone_otp_expires_at` is in the future.
Response: `{ "valid": true }` or `422 { "message": "Invalid or expired OTP" }`

**POST /api/v1/auth/reset-password**
Request: `{ phone, otp, password, password_confirmation }`
Verify OTP, update password, clear OTP fields, delete all user tokens.
Response: `{ "message": "Password reset successfully" }`

**GET /api/v1/auth/me**
Response: `{ id, name, phone, created_at, total_complaints }`

**PUT /api/v1/auth/profile**
Request: `{ name }`
Response: updated user object

---

### LocateController

**POST /api/v1/locate**
Request: `{ lat: float, lon: float }`

Action:
1. Validate lat/lon within Pakistan bounds (lat 23–37, lon 60–77)
2. `GeoJsonService::findDistrict($lat, $lon)`
3. If null: `422 { "message": "Location not found within Pakistan" }`
4. Find district in DB by pcode
5. Load all current terms for that district with politician + constituency + type
6. Separate MNAs and MPAs

Response:
```json
{
  "district": { "id": "...", "name": "Lahore", "province": "Punjab" },
  "mnas": [{
    "term_id": "...",
    "constituency_code": "NA-118",
    "constituency_name": "Lahore-II",
    "politician_id": "...",
    "politician_name": "Hamza Shahbaz",
    "party": "PML(N)",
    "photo_url": "https://..."
  }],
  "mpas": [...]
}
```

---

### ComplaintTypeController

**GET /api/v1/complaint-types**
Returns all active complaint types ordered by sort_order.
No pagination — only 28 types, return all.
Response: `{ "data": [{ "id", "name", "slug", "icon" }] }`

---

### ComplaintController

**POST /api/v1/complaints**
Request: multipart/form-data
```
photo              : image (required, jpg/png/webp, max 10MB)
description        : string (optional, max 1000 chars)
latitude           : decimal (required)
longitude          : decimal (required)
district_id        : ulid (required)
complaint_type_id  : ulid (required)
term_ids[]         : array of term ULIDs (required, min 1, max 5)
```

Action:
1. Check user is_active (403 if suspended)
2. Validate all fields
3. Verify complaint_type_id is active
4. Verify all term_ids are is_current = true and belong to the given district
5. Run rate limit checks (same type + location + day, and daily cap of 5)
6. Store photo: `$file->store('complaints', 'public')`
7. Create complaint
8. Attach term_ids via pivot
9. `Term::whereIn('id', $termIds)->increment('chittar_count')`
10. Return complaint (201)

**GET /api/v1/complaints/mine**
Paginated, newest first.
Each item: photo_url, description, complaint_type, district, status, created_at,
politicians chittared (name + constituency_code).
Only show complaints where status != 'unpublished'.

**GET /api/v1/complaints/{complaint}**
User can only see own complaints (403 otherwise).
Hide unpublished complaints (404).

**POST /api/v1/complaints/{complaint}/resolve**
Must be complaint owner. Must be status = 'open'.
Sets status = 'resolved', resolved_at = now().
Chittar count unchanged (accountability stands).

**POST /api/v1/complaints/{complaint}/withdraw**
Must be complaint owner. Must be status = 'open'.
Sets status = 'withdrawn'.
Chittar count unchanged.

---

### PoliticianController

**GET /api/v1/politicians**
Query params: `search`, `party`, `province`, `assembly`, `per_page` (default 20)
FULLTEXT search on name. Filter by party (LIKE), province, assembly short_code.
Response: paginated with current_term nested.

**GET /api/v1/politicians/{politician}**
Full profile including:
- current_term with constituency + district + province
- total_chittars (= current term chittar_count)
- complaint_stats: { total, open, resolved, withdrawn }
- recent_complaints: last 10 open, non-unpublished complaints
  (photo_url, description, district, created_at — NO user identity)

---

### SearchController

**GET /api/v1/search?q={query}**
Params: `q` (required, min 2 chars), `limit` (per type, default 5, max 20)

Call `SearchService::search($q, $limit)`.

Response:
```json
{
  "query": "lahore",
  "results": {
    "districts": [{ "type": "district", "label": "Lahore, Punjab", "id": "..." }],
    "constituencies": [{ "type": "constituency", "label": "NA-118 — Lahore-II", "id": "...", "current_rep": "Hamza Shahbaz" }],
    "politicians": [{ "type": "politician", "label": "Hamza Shahbaz — NA-118", "id": "...", "photo_url": "..." }]
  },
  "total": 11
}
```

---

### StatsController

**GET /api/v1/stats/leaderboard**
Params: `province`, `assembly`, `period` (week/month/all), `limit` (default 20, max 50)

For `period=all`: query `terms.chittar_count` directly (fast, indexed).
For `period=week` or `month`: join complaint_terms → complaints, filter by
`complaints.created_at`, GROUP BY term_id, COUNT(*) — only include
non-unpublished complaints.

Response: ranked list with rank number, politician info, chittar_count.

**GET /api/v1/stats/summary**
National snapshot — cache for 5 minutes.
```json
{
  "total_complaints": 0,
  "total_chittars_sent": 0,
  "total_politicians": 859,
  "most_chittared_this_week": { "name": "...", "count": 0, "constituency": "..." },
  "most_active_district": { "name": "...", "complaint_count": 0 },
  "complaints_today": 0,
  "complaints_this_week": 0
}
```

**GET /api/v1/stats/district/{district}**
District stats: total complaints, top 3 chittared politicians in this district,
recent 10 non-unpublished complaints.

**GET /api/v1/stats/politician/{politician}**
Politician stats: monthly chittar breakdown (last 6 months, array of
`{ month, year, count }`), complaint type breakdown, resolution rate.

---

## API Response Format

**Success (single resource):**
```json
{ "data": { ... } }
```

**Success (paginated list):**
```json
{
  "data": [...],
  "meta": { "current_page": 1, "per_page": 20, "total": 859, "last_page": 43 }
}
```

**Validation error (422):**
```json
{ "message": "The given data was invalid.", "errors": { "phone": ["..."] } }
```

**Auth error (401):** `{ "message": "Unauthenticated." }`
**Forbidden (403):** `{ "message": "Forbidden." }`
**Not found (404):** `{ "message": "Not found." }`
**Rate limited (422):** `{ "message": "..." }` (specific message per limit type)

Use Laravel API Resources for all responses. Never return raw models.

---

## File Storage

```php
// Complaint photos:
$path = $file->store('complaints', 'public');
// → storage/app/public/complaints/randomname.jpg
// → accessible at: asset('storage/complaints/randomname.jpg')

// Politician photos (seeder copies from chittar_data/):
// → storage/app/public/politicians/na-118.jpg
// → photo_path stored as: 'politicians/na-118.jpg'

// Run once:
php artisan storage:link
```

Max sizes: complaint photos 10MB, politician photos 2MB.
Accepted formats: jpg, jpeg, png, webp.

---

## Coding Conventions

- **Controllers:** thin — logic in Services or dedicated Action classes
- **Validation:** Form Request classes always (`php artisan make:request`)
- **Responses:** API Resources always — never raw arrays or models from API
- **Eager loading:** always explicit `->with([...])` — no lazy loading in loops
- **Pagination:** all list endpoints paginate, default 20, never unbounded
- **Route model binding:** works automatically with HasUlids
- **Namespace:** API controllers in `App\Http\Controllers\Api\`
  Admin controllers in `App\Http\Controllers\Admin\`
- **Resources:** `App\Http\Resources\` — name as `{Model}Resource`, `{Model}Collection`
- **Form Requests:** `App\Http\Requests\` — name as `Store{Model}Request`, `Update{Model}Request`

---

## Implementation Order

### Phase 1 — Foundation
1. Migrations (in dependency order)
2. Seeders (Province → District → ConstituencyType → Constituency →
   ComplaintType → Politician → Term)
3. Verify: 7 provinces, 160 districts, 5 types, 859 constituencies,
   28 complaint types, ~859 politicians, 859 terms
4. All Models with HasUlids + relationships
5. GeoJsonService (point-in-polygon)
6. SearchService

### Phase 2 — Admin Panel
7. Clean up Breeze layout, add sidebar nav
8. Dashboard with stats cards
9. Province CRUD
10. District CRUD
11. Constituency Type CRUD
12. Constituency CRUD
13. Complaint Type CRUD (with reorder)
14. Politician CRUD (with photo upload)
15. Term CRUD
16. Complaints management (index + show + status actions + delete)
17. Mobile Users management (index + show + toggle active)

### Phase 3 — Mobile API
18. AuthController (all endpoints)
19. LocateController
20. ComplaintTypeController
21. DistrictController + ConstituencyController
22. PoliticianController
23. ComplaintController (with rate limiting)
24. SearchController
25. StatsController
26. All API Resources

### Phase 4 — Polish
27. API rate limiting via throttle middleware (60 req/min general, 10/min for locate)
28. Cache stats/summary endpoint (5 min, bust on new complaint)
29. Image resize on upload (politician photos max 400x400, complaint photos max 1200px wide)

---

## Environment Notes

- Server: IONOS VPS, Ubuntu 24.04, CloudPanel
- PHP 8.3+, MySQL 8.0+
- ~80GB storage available — all files stored locally
- `chittar_data/` sits at project root (same level as `app/`, `routes/`)
- Run `php artisan storage:link` once after setup
- SMS and email delivery stubbed — endpoints exist, nothing is sent

---

## What NOT to Build (Phase 1 Scope)

- No public web pages (leaderboard site is Phase 2)
- No push notifications
- No SMS/email delivery
- No payment or subscription features
- No councillor (UC) data
- No AJK or GB assembly data (districts exist, no terms)
- No comment system on complaints
- No photo moderation queue
- No complaint editing after submission (immutable citizen records)