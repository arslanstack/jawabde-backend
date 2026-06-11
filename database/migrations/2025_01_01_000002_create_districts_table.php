<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('districts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('pcode', 10)->unique();
            $table->string('name', 100);
            $table->string('division', 100)->nullable();
            $table->foreignUlid('province_id')->constrained()->restrictOnDelete();
            $table->decimal('center_lat', 10, 7)->nullable();
            $table->decimal('center_lon', 10, 7)->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('province_id');
            $table->fullText('name', 'ft_districts_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
