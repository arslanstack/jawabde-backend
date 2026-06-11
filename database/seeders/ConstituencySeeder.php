<?php

namespace Database\Seeders;

use App\Models\Constituency;
use App\Models\ConstituencyType;
use App\Models\District;
use Illuminate\Database\Seeder;

class ConstituencySeeder extends Seeder
{
    public function run(): void
    {
        $mnas = json_decode(file_get_contents(base_path('chittar_data/politicians/mnas.json')), true);
        $mpas = json_decode(file_get_contents(base_path('chittar_data/politicians/all_mpas.json')), true);

        $typeMap = ConstituencyType::all()->keyBy('short_code');
        $districtMap = District::all()->keyBy('name');

        $count = 0;
        $skipped = 0;

        foreach (array_merge($mnas, $mpas) as $entry) {
            $code = $entry['constituency_code'] ?? null;
            if (!$code) continue;

            $prefix = strtoupper(explode('-', $code)[0]);
            $type = $typeMap->get($prefix);

            if (!$type) {
                $this->command->warn("Unknown prefix: {$prefix} for {$code}");
                continue;
            }

            $districtName = $entry['district'] ?? null;
            $district = $districtName ? $districtMap->get($districtName) : null;

            if (!$district) {
                // Try to find by partial match
                if ($districtName) {
                    foreach ($districtMap as $name => $dist) {
                        if (str_contains(strtolower($name), strtolower($districtName)) ||
                            str_contains(strtolower($districtName), strtolower($name))) {
                            $district = $dist;
                            break;
                        }
                    }
                }

                if (!$district) {
                    $skipped++;
                    continue;
                }
            }

            Constituency::updateOrCreate(
                ['code' => $code],
                [
                    'name'        => $entry['constituency_name'] ?? $code,
                    'type_id'     => $type->id,
                    'district_id' => $district->id,
                ]
            );
            $count++;
        }

        $this->command->info("Seeded {$count} constituencies. Skipped {$skipped}.");
    }
}
