<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('constituency_types', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->unique();
            $table->string('short_code', 5)->unique();
            $table->enum('level', ['national', 'provincial']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constituency_types');
    }
};
