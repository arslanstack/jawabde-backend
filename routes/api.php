<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ComplaintApiController;
use App\Http\Controllers\Api\ComplaintTypeApiController;
use App\Http\Controllers\Api\ConstituencyApiController;
use App\Http\Controllers\Api\DistrictApiController;
use App\Http\Controllers\Api\LocateController;
use App\Http\Controllers\Api\PoliticianApiController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\StatsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Auth
    Route::post('auth/register',        [AuthController::class, 'register']);
    Route::post('auth/login',           [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/verify-otp',      [AuthController::class, 'verifyOtp']);
    Route::post('auth/reset-password',  [AuthController::class, 'resetPassword']);

    // Public data
    Route::post('locate',                       [LocateController::class, 'locate'])->middleware('throttle:10,1');
    Route::get('complaint-types',               [ComplaintTypeApiController::class, 'index']);
    Route::get('districts',                     [DistrictApiController::class, 'index']);
    Route::get('districts/{district}',          [DistrictApiController::class, 'show']);
    Route::get('constituencies',                [ConstituencyApiController::class, 'index']);
    Route::get('constituencies/{constituency}', [ConstituencyApiController::class, 'show']);
    Route::get('politicians',                   [PoliticianApiController::class, 'index']);
    Route::get('politicians/{politician}',      [PoliticianApiController::class, 'show']);
    Route::get('search',                        [SearchController::class, 'search']);
    Route::get('stats/leaderboard',             [StatsController::class, 'leaderboard']);
    Route::get('stats/summary',                 [StatsController::class, 'summary']);
    Route::get('stats/district/{district}',     [StatsController::class, 'district']);
    Route::get('stats/politician/{politician}', [StatsController::class, 'politician']);

    // Protected
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout',                     [AuthController::class, 'logout']);
        Route::get('auth/me',                          [AuthController::class, 'me']);
        Route::put('auth/profile',                     [AuthController::class, 'updateProfile']);
        Route::post('complaints',                      [ComplaintApiController::class, 'store']);
        Route::get('complaints/mine',                  [ComplaintApiController::class, 'mine']);
        Route::get('complaints/{complaint}',           [ComplaintApiController::class, 'show']);
        Route::post('complaints/{complaint}/resolve',  [ComplaintApiController::class, 'resolve']);
        Route::post('complaints/{complaint}/withdraw', [ComplaintApiController::class, 'withdraw']);
    });
});
