<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'notaris@notarisnhn.id'],
            [
                'name' => 'Nurul Huda Nelson, S.H., M.Kn.',
                'password' => bcrypt('password'),
                'role' => UserRole::NOTARIS,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'zahrah@notarisnhn.id'],
            [
                'name' => 'Zahrah Fitri Sagita',
                'password' => bcrypt('password'),
                'role' => UserRole::STAF,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );

        User::updateOrCreate(
            ['email' => 'fermil@notarisnhn.id'],
            [
                'name' => 'Fermil Idrian',
                'password' => bcrypt('password'),
                'role' => UserRole::STAF,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
    }
}
