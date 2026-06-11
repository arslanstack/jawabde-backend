<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_terms', function (Blueprint $table) {
            $table->foreignUlid('complaint_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('term_id')->constrained()->restrictOnDelete();
            $table->primary(['complaint_id', 'term_id']);

            $table->index('term_id');
            $table->index('complaint_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_terms');
    }
};
