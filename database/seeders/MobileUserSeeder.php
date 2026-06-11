<?php

namespace Database\Seeders;

use App\Models\MobileUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MobileUserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name'     => 'Ali Hassan',
                'phone'    => '03001234567',
                'password' => 'password',
            ],
            [
                'name'     => 'Fatima Malik',
                'phone'    => '03121234567',
                'password' => 'password',
            ],
            [
                'name'     => 'Usman Qureshi',
                'phone'    => '03331234567',
                'password' => 'password',
            ],
        ];

        foreach ($users as $user) {
            MobileUser::updateOrCreate(
                ['phone' => $user['phone']],
                [
                    'name'      => $user['name'],
                    'password'  => Hash::make($user['password']),
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('Seeded 3 mobile users (password: password)');
        $this->command->table(['Name', 'Phone'], array_map(fn ($u) => [$u['name'], $u['phone']], $users));
    }
}
