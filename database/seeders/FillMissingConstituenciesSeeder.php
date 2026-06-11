<?php

namespace Database\Seeders;

use App\Models\Constituency;
use App\Models\ConstituencyType;
use App\Models\District;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class FillMissingConstituenciesSeeder extends Seeder
{
    // District name corrections: JSON name → DB name
    private const DISTRICT_CORRECTIONS = [
        'Battagram'           => 'Batagram',
        'Dera Ismail Khan'    => 'D. I. Khan',
        'D I Khan'            => 'D. I. Khan',
        'Murree-cum'          => 'Rawalpindi',   // Murree-cum-Kotli Sattian is in Rawalpindi
        'Murree'              => 'Rawalpindi',
        'Wazirabad'           => 'Gujranwala',   // Wazirabad tehsil is in Gujranwala
        'Kot Addu'            => 'Muzaffargarh', // Kot Addu tehsil is in Muzaffargarh
        'Layyah'              => 'Leiah',
        'Taunsa'              => 'Dera Ghazi Khan',
        'Tonsa'               => 'Dera Ghazi Khan',
        'Qambar Shahdadkot'   => 'Kambar Shahdad Kot',
        'Nawabshah'           => 'Shaheed Benazir Abad',
        'Umerkot'             => 'Umer Kot',
        'Karachi Korangi'     => 'Korangi Karachi',
        'Karachi East'        => 'East Karachi',
        'Karachi South'       => 'South Karachi',
        'Karachi Keamari'     => 'West Karachi',  // Keamari carved from West Karachi in 2020
        'Karachi West'        => 'West Karachi',
        'Karachi Central'     => 'Central Karachi',
        'Karachi Malir'       => 'Malir Karachi',
        'Talagang'            => 'Chakwal',
        'Shaheed Benazirabad' => 'Shaheed Benazir Abad',
        'Upper Chitral'       => 'Chitral Upper',
        'Lower Chitral'       => 'Chitral Lower',
        'Torghar'             => 'Tor Ghar',
        'Jafarabad'           => 'Jaffarabad',
        'Usta Muhammad'       => 'Nasirabad',     // Usta Mohammad tehsil is in Nasirabad
        'Hub'                 => 'Lasbela',       // Hub is in Lasbela district
        'Surab'               => 'Khuzdar',       // Surab tehsil is in Khuzdar
    ];

    public function run(): void
    {
        $logPath = storage_path('logs/still_missing.log');
        file_put_contents($logPath, ''); // clear previous run

        $mnas = json_decode(file_get_contents(base_path('chittar_data/politicians/mnas.json')), true);
        $mpas = json_decode(file_get_contents(base_path('chittar_data/politicians/all_mpas.json')), true);

        $typeMap     = ConstituencyType::all()->keyBy('short_code');
        $districtMap = District::all()->keyBy('name');

        $created   = 0;
        $skipped   = 0;
        $noDistrict = 0;

        foreach (array_merge($mnas, $mpas) as $entry) {
            $code = trim($entry['constituency_code'] ?? '');
            $memberName = trim($entry['member_name'] ?? '');

            if (!$code || !$memberName || strtolower($memberName) === 'vacant') {
                continue;
            }

            // Skip if constituency already exists
            if (Constituency::where('code', $code)->exists()) {
                $skipped++;
                continue;
            }

            // Resolve assembly type
            $prefix = strtoupper(explode('-', $code)[0]);
            $type = $typeMap->get($prefix);
            if (!$type) {
                $this->log($logPath, "UNKNOWN_PREFIX|{$code}|{$memberName}");
                continue;
            }

            // Resolve district
            $districtName = trim($entry['district'] ?? '');
            $district = $this->resolveDistrict($districtName, $districtMap);

            if (!$district) {
                $noDistrict++;
                $this->log($logPath, "NO_DISTRICT|{$code}|{$memberName}|{$districtName}");
                continue;
            }

            // Create constituency
            $constituency = Constituency::create([
                'id'          => (string) Str::ulid(),
                'code'        => $code,
                'name'        => $entry['constituency_name'] ?? $code,
                'type_id'     => $type->id,
                'district_id' => $district->id,
            ]);

            // Find or create politician
            $politician = Politician::firstOrCreate(
                ['name' => $memberName],
                ['party' => $entry['party'] ?? null]
            );

            // Create term if not already there
            Term::updateOrCreate(
                ['politician_id' => $politician->id, 'constituency_id' => $constituency->id, 'election_year' => 2024],
                ['is_current' => true, 'chittar_count' => 0]
            );

            $created++;
        }

        // Also fill terms for constituencies that exist but have no current term
        $orphanTerms = 0;
        foreach (array_merge($mnas, $mpas) as $entry) {
            $code = trim($entry['constituency_code'] ?? '');
            $memberName = trim($entry['member_name'] ?? '');
            if (!$code || !$memberName || strtolower($memberName) === 'vacant') continue;

            $constituency = Constituency::where('code', $code)->first();
            if (!$constituency) continue;

            $hasTerm = Term::where('constituency_id', $constituency->id)->where('is_current', true)->exists();
            if ($hasTerm) continue;

            $politician = Politician::firstOrCreate(
                ['name' => $memberName],
                ['party' => $entry['party'] ?? null]
            );

            Term::updateOrCreate(
                ['politician_id' => $politician->id, 'constituency_id' => $constituency->id, 'election_year' => 2024],
                ['is_current' => true, 'chittar_count' => 0]
            );

            $orphanTerms++;
        }

        $this->command->info("Created {$created} missing constituencies.");
        $this->command->info("Skipped {$skipped} that already existed.");
        $this->command->info("Could not resolve district for {$noDistrict} entries — logged to storage/logs/still_missing.log.");
        if ($orphanTerms > 0) {
            $this->command->info("Filled {$orphanTerms} missing terms for existing constituencies.");
        }
    }

    private function resolveDistrict(string $name, $districtMap): ?District
    {
        if (!$name) return null;

        // 1. Exact match
        if ($districtMap->has($name)) return $districtMap->get($name);

        // 2. Case-insensitive + trim exact match
        foreach ($districtMap as $dbName => $district) {
            if (strtolower(trim($dbName)) === strtolower(trim($name))) return $district;
        }

        // 3. Corrections map
        foreach (self::DISTRICT_CORRECTIONS as $from => $to) {
            if (strtolower($name) === strtolower($from)) {
                return $districtMap->get($to);
            }
        }

        // 4. Partial contains match
        foreach ($districtMap as $dbName => $district) {
            if (str_contains(strtolower($dbName), strtolower($name)) ||
                str_contains(strtolower($name), strtolower($dbName))) {
                return $district;
            }
        }

        return null;
    }

    private function log(string $path, string $message): void
    {
        file_put_contents($path, $message . PHP_EOL, FILE_APPEND);
    }
}
