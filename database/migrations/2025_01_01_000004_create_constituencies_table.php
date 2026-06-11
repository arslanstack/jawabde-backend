<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('constituencies', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 100);
            $table->foreignUlid('type_id')->constrained('constituency_types')->restrictOnDelete();
            $table->foreignUlid('district_id')->constrained()->restrictOnDelete();
            $table->timestamps();

            $table->index('district_id');
            $table->index('type_id');
            $table->index('code');
            $table->fullText('name', 'ft_constituencies_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('constituencies');
    }
};
