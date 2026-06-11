<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ProvinceSeeder::class,
            DistrictSeeder::class,
            ConstituencyTypeSeeder::class,
            ConstituencySeeder::class,
            ComplaintTypeSeeder::class,
            PoliticianSeeder::class,
            TermSeeder::class,
        ]);
    }
}
