<?php

namespace Database\Seeders;

use App\Models\ConstituencyType;
use Illuminate\Database\Seeder;

class ConstituencyTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'National Assembly',           'short_code' => 'NA', 'level' => 'national'],
            ['name' => 'Punjab Assembly',             'short_code' => 'PP', 'level' => 'provincial'],
            ['name' => 'Sindh Assembly',              'short_code' => 'PS', 'level' => 'provincial'],
            ['name' => 'Khyber Pakhtunkhwa Assembly', 'short_code' => 'PK', 'level' => 'provincial'],
            ['name' => 'Balochistan Assembly',        'short_code' => 'PB', 'level' => 'provincial'],
        ];

        foreach ($types as $type) {
            ConstituencyType::updateOrCreate(['short_code' => $type['short_code']], $type);
        }
    }
}
