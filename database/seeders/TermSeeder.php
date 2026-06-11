<?php

namespace Database\Seeders;

use App\Models\Constituency;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Database\Seeder;

class TermSeeder extends Seeder
{
    public function run(): void
    {
        $mnas = json_decode(file_get_contents(base_path('chittar_data/politicians/mnas.json')), true);
        $mpas = json_decode(file_get_contents(base_path('chittar_data/politicians/all_mpas.json')), true);

        $all = array_merge($mnas, $mpas);

        $constituencyMap = Constituency::all()->keyBy('code');
        $politicianMap = Politician::all()->keyBy('name');

        $count = 0;
        $skipped = 0;

        foreach ($all as $entry) {
            $name = trim($entry['member_name'] ?? '');
            if (!$name || strtolower($name) === 'vacant') {
                $skipped++;
                continue;
            }

            $code = $entry['constituency_code'] ?? null;
            if (!$code) {
                $skipped++;
                continue;
            }

            $constituency = $constituencyMap->get($code);
            $politician = $politicianMap->get($name);

            if (!$constituency || !$politician) {
                $skipped++;
                continue;
            }

            Term::updateOrCreate(
                ['constituency_id' => $constituency->id, 'election_year' => 2024],
                [
                    'politician_id' => $politician->id,
                    'is_current'    => true,
                    'chittar_count' => 0,
                ]
            );
            $count++;
        }

        $this->command->info("Seeded {$count} terms. Skipped {$skipped}.");
    }
}
