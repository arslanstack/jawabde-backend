<?php

namespace Database\Seeders;

use App\Models\Province;
use Illuminate\Database\Seeder;

class ProvinceSeeder extends Seeder
{
    public function run(): void
    {
        $provinces = [
            ['name' => 'Punjab',              'code' => 'PB'],
            ['name' => 'Sindh',               'code' => 'SD'],
            ['name' => 'Khyber Pakhtunkhwa',  'code' => 'KP'],
            ['name' => 'Balochistan',         'code' => 'BL'],
            ['name' => 'Islamabad',           'code' => 'IS'],
            ['name' => 'Azad Kashmir',        'code' => 'AK'],
            ['name' => 'Gilgit Baltistan',    'code' => 'GB'],
        ];

        foreach ($provinces as $province) {
            Province::updateOrCreate(['code' => $province['code']], $province);
        }
    }
}
