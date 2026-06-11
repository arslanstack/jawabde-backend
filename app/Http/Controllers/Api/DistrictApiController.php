<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\District;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DistrictApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $districts = District::with('province')
            ->orderBy('name')
            ->paginate(50);

        return response()->json([
            'data' => $districts->map(fn ($d) => [
                'id'       => $d->id,
                'name'     => $d->name,
                'pcode'    => $d->pcode,
                'province' => $d->province->name,
            ]),
            'meta' => [
                'current_page' => $districts->currentPage(),
                'per_page'     => $districts->perPage(),
                'total'        => $districts->total(),
                'last_page'    => $districts->lastPage(),
            ],
        ]);
    }

    public function show(District $district): JsonResponse
    {
        $district->load('province');

        return response()->json(['data' => [
            'id'         => $district->id,
            'name'       => $district->name,
            'pcode'      => $district->pcode,
            'division'   => $district->division,
            'center_lat' => $district->center_lat,
            'center_lon' => $district->center_lon,
            'province'   => $district->province->name,
        ]]);
    }
}
