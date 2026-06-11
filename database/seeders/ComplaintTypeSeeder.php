<?php

namespace Database\Seeders;

use App\Models\ComplaintType;
use Illuminate\Database\Seeder;

class ComplaintTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Pothole',               'slug' => 'pothole',             'icon' => 'road',          'sort_order' => 1],
            ['name' => 'Street Light',          'slug' => 'street-light',        'icon' => 'lightbulb',     'sort_order' => 2],
            ['name' => 'Sewage Overflow',       'slug' => 'sewage-overflow',     'icon' => 'droplets',      'sort_order' => 3],
            ['name' => 'Garbage Collection',    'slug' => 'garbage-collection',  'icon' => 'trash',         'sort_order' => 4],
            ['name' => 'Water Supply',          'slug' => 'water-supply',        'icon' => 'waves',         'sort_order' => 5],
            ['name' => 'Tubewell / Handpump',   'slug' => 'tubewell',            'icon' => 'droplet',       'sort_order' => 6],
            ['name' => 'Filtration Plant',      'slug' => 'filtration-plant',    'icon' => 'filter',        'sort_order' => 7],
            ['name' => 'Road Damage',           'slug' => 'road-damage',         'icon' => 'construction',  'sort_order' => 8],
            ['name' => 'Footpath / Pavement',   'slug' => 'footpath',            'icon' => 'footprints',    'sort_order' => 9],
            ['name' => 'Overhead Bridge',       'slug' => 'overhead-bridge',     'icon' => 'bridge',        'sort_order' => 10],
            ['name' => 'Park / Green Area',     'slug' => 'park',                'icon' => 'trees',         'sort_order' => 11],
            ['name' => 'Playground',            'slug' => 'playground',          'icon' => 'gamepad',       'sort_order' => 12],
            ['name' => 'Graveyard',             'slug' => 'graveyard',           'icon' => 'landmark',      'sort_order' => 13],
            ['name' => 'Encroachment',          'slug' => 'encroachment',        'icon' => 'fence',         'sort_order' => 14],
            ['name' => 'Stray Animals',         'slug' => 'stray-animals',       'icon' => 'paw-print',     'sort_order' => 15],
            ['name' => 'Security / Crime',      'slug' => 'security',            'icon' => 'shield-alert',  'sort_order' => 16],
            ['name' => 'Drug Activity',         'slug' => 'drug-activity',       'icon' => 'alert-triangle','sort_order' => 17],
            ['name' => 'Illegal Construction',  'slug' => 'illegal-construction','icon' => 'hammer',        'sort_order' => 18],
            ['name' => 'School Issue',          'slug' => 'school',              'icon' => 'school',        'sort_order' => 19],
            ['name' => 'Hospital / Clinic',     'slug' => 'hospital',            'icon' => 'hospital',      'sort_order' => 20],
            ['name' => 'Electricity Outage',    'slug' => 'electricity',         'icon' => 'zap-off',       'sort_order' => 21],
            ['name' => 'Gas Supply',            'slug' => 'gas-supply',          'icon' => 'flame',         'sort_order' => 22],
            ['name' => 'Public Toilet',         'slug' => 'public-toilet',       'icon' => 'building',      'sort_order' => 23],
            ['name' => 'Noise Pollution',       'slug' => 'noise',               'icon' => 'volume-x',      'sort_order' => 24],
            ['name' => 'Air Pollution',         'slug' => 'air-pollution',       'icon' => 'wind',          'sort_order' => 25],
            ['name' => 'Waterlogging',          'slug' => 'waterlogging',        'icon' => 'flood',         'sort_order' => 26],
            ['name' => 'Missing Manhole',       'slug' => 'manhole',             'icon' => 'circle-dashed', 'sort_order' => 27],
            ['name' => 'Other',                 'slug' => 'other',               'icon' => 'more-horizontal','sort_order' => 99],
        ];

        foreach ($types as $type) {
            ComplaintType::updateOrCreate(['slug' => $type['slug']], $type + ['is_active' => true]);
        }
    }
}
