<?php

use App\Http\Controllers\Admin\ComplaintController;
use App\Http\Controllers\Admin\ComplaintTypeController;
use App\Http\Controllers\Admin\ConstituencyController;
use App\Http\Controllers\Admin\ConstituencyTypeController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DistrictController;
use App\Http\Controllers\Admin\MobileUserController;
use App\Http\Controllers\Admin\PoliticianController;
use App\Http\Controllers\Admin\ProvinceController;
use App\Http\Controllers\Admin\TermController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('provinces', ProvinceController::class)->except(['create', 'edit', 'show']);
    Route::resource('districts', DistrictController::class)->except(['create', 'edit', 'show']);
    Route::resource('constituency-types', ConstituencyTypeController::class)->except(['create', 'edit', 'show']);
    Route::resource('constituencies', ConstituencyController::class)->except(['create', 'edit', 'show']);
    Route::resource('politicians', PoliticianController::class)->except(['create', 'edit', 'show']);
    Route::resource('terms', TermController::class)->except(['create', 'edit', 'show']);
    Route::resource('complaint-types', ComplaintTypeController::class)->except(['create', 'edit', 'show']);
    Route::post('complaint-types/reorder', [ComplaintTypeController::class, 'reorder'])->name('complaint-types.reorder');
    Route::patch('complaint-types/{complaintType}/toggle-active', [ComplaintTypeController::class, 'toggleActive'])->name('complaint-types.toggle-active');

    Route::resource('complaints', ComplaintController::class)->only(['index', 'destroy']);
    Route::patch('complaints/{complaint}/status', [ComplaintController::class, 'updateStatus'])->name('complaints.status');

    Route::resource('mobile-users', MobileUserController::class)->only(['index', 'show', 'destroy']);
    Route::patch('mobile-users/{mobileUser}/toggle-active', [MobileUserController::class, 'toggleActive'])->name('mobile-users.toggle-active');
});
