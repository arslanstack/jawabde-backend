<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('mobile_user_id')->constrained('mobile_users')->restrictOnDelete();
            $table->foreignUlid('district_id')->constrained()->restrictOnDelete();
            $table->foreignUlid('complaint_type_id')->constrained('complaint_types')->restrictOnDelete();
            $table->string('photo_path', 255);
            $table->text('description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('latitude_rounded', 7, 2)->virtualAs('ROUND(latitude, 2)');
            $table->decimal('longitude_rounded', 7, 2)->virtualAs('ROUND(longitude, 2)');
            $table->enum('status', ['open', 'resolved', 'withdrawn', 'unpublished'])->default('open');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index('mobile_user_id');
            $table->index('district_id');
            $table->index('complaint_type_id');
            $table->index('status');
            $table->index('created_at');
            $table->index(['district_id', 'status']);
            $table->index(['mobile_user_id', 'created_at']);
            $table->index(['mobile_user_id', 'complaint_type_id', 'latitude_rounded', 'longitude_rounded'], 'idx_complaints_rate_limit');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
