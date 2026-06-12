<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('politicians', function (Blueprint $table) {
            $table->text('bio')->nullable()->after('photo_path');
            $table->string('email', 150)->nullable()->after('bio');
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('facebook_url', 255)->nullable()->after('phone');
            $table->string('twitter_handle', 100)->nullable()->after('facebook_url');
            $table->string('data_source', 100)->nullable()->after('twitter_handle');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('politicians', function (Blueprint $table) {
            $table->dropColumn(['bio', 'email', 'phone', 'facebook_url', 'twitter_handle', 'data_source']);
        });
    }
};
