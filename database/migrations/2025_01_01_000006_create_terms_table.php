<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terms', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('politician_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('constituency_id')->constrained()->restrictOnDelete();
            $table->year('election_year');
            $table->boolean('is_current')->default(true);
            $table->unsignedBigInteger('chittar_count')->default(0);
            $table->timestamps();

            $table->unique(['constituency_id', 'election_year']);
            $table->index('politician_id');
            $table->index('is_current');
            $table->index(['is_current', 'chittar_count']);
            $table->index(['constituency_id', 'is_current']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terms');
    }
};
