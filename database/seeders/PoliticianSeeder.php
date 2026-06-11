<?php

namespace Database\Seeders;

use App\Models\Constituency;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class PoliticianSeeder extends Seeder
{
    public function run(): void
    {
        $mnas = json_decode(file_get_contents(base_path('chittar_data/politicians/mnas.json')), true);
        $mpas = json_decode(file_get_contents(base_path('chittar_data/politicians/all_mpas.json')), true);

        $all = array_merge($mnas, $mpas);
        $count = 0;

        foreach ($all as $entry) {
            $name = trim($entry['member_name'] ?? '');
            if (!$name || strtolower($name) === 'vacant') continue;

            Politician::firstOrCreate(
                ['name' => $name],
                ['party' => $entry['party'] ?? null]
            );
            $count++;
        }

        $this->command->info("Seeded {$count} politicians.");

        // Copy MNA photos — map is keyed by constituency_code
        $photoMapPath = base_path('chittar_data/photos/mna_photo_map.json');
        if (!file_exists($photoMapPath)) return;

        $photoMap = json_decode(file_get_contents($photoMapPath), true);
        $photoCount = 0;

        Storage::disk('public')->makeDirectory('politicians');

        foreach ($photoMap as $constituencyCode => $photoRelPath) {
            // $photoRelPath is like "chittar_data/photos/mna_1617.jpg"
            $sourcePath = base_path($photoRelPath);
            if (!file_exists($sourcePath)) {
                // Try just the filename in photos dir
                $sourcePath = base_path('chittar_data/photos/' . basename($photoRelPath));
                if (!file_exists($sourcePath)) continue;
            }

            // Find politician via constituency → term
            $constituency = Constituency::where('code', $constituencyCode)->first();
            if (!$constituency) continue;

            $term = $constituency->terms()->with('politician')->latest()->first();
            if (!$term?->politician) continue;

            $politician = $term->politician;
            $destName = 'politicians/' . basename($photoRelPath);
            Storage::disk('public')->put($destName, file_get_contents($sourcePath));
            $politician->update(['photo_path' => $destName]);
            $photoCount++;
        }

        $this->command->info("Copied {$photoCount} politician photos.");
    }
}
