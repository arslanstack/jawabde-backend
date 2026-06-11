<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Province;
use Illuminate\Database\Seeder;

class DistrictSeeder extends Seeder
{
    public function run(): void
    {
        $geojsonPath = base_path('chittar_data/boundaries/pakistan_districts_adm3.geojson');
        $geojson = json_decode(file_get_contents($geojsonPath), true);

        $provinceMap = Province::all()->keyBy('name');

        $count = 0;
        foreach ($geojson['features'] as $feature) {
            $props = $feature['properties'];
            $provinceName = $props['adm1_name'] ?? null;

            // Normalize province name
            $province = $provinceMap->get($provinceName);

            if (!$province) {
                // Try partial matches
                foreach ($provinceMap as $name => $prov) {
                    if (str_contains(strtolower($provinceName ?? ''), strtolower($name)) ||
                        str_contains(strtolower($name), strtolower($provinceName ?? ''))) {
                        $province = $prov;
                        break;
                    }
                }
            }

            if (!$province) {
                $this->command->warn("Province not found: {$provinceName}");
                continue;
            }

            $pcode = $props['adm2_pcode'] ?? null;
            $name  = $props['adm2_name'] ?? null;

            if (!$pcode || !$name) {
                continue;
            }

            District::updateOrCreate(
                ['pcode' => $pcode],
                [
                    'name'        => $name,
                    'province_id' => $province->id,
                    'center_lat'  => $props['center_lat'] ?? null,
                    'center_lon'  => $props['center_lon'] ?? null,
                ]
            );
            $count++;
        }

        $this->command->info("Seeded {$count} districts.");
    }
}
