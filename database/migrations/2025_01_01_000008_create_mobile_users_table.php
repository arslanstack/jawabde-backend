<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mobile_users', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->nullable();
            $table->string('phone', 20)->unique();
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('phone_otp', 10)->nullable();
            $table->timestamp('phone_otp_expires_at')->nullable();
            $table->rememberToken();
            $table->timestamps();

            $table->index('phone');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mobile_users');
    }
};
