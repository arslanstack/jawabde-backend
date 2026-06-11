<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComplaintType;
use Illuminate\Http\JsonResponse;

class ComplaintTypeApiController extends Controller
{
    public function index(): JsonResponse
    {
        $types = ComplaintType::where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'icon']);

        return response()->json(['data' => $types]);
    }
}
