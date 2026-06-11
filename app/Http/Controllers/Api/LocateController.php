<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\District;
use App\Services\GeoJsonService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocateController extends Controller
{
    public function __construct(private GeoJsonService $geoJson) {}

    public function locate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:23,37',
            'lon' => 'required|numeric|between:60,77',
        ]);

        $props = $this->geoJson->findDistrict($data['lat'], $data['lon']);

        if (!$props) {
            return response()->json(['message' => 'Location not found within Pakistan'], 422);
        }

        $district = District::with('province')->where('pcode', $props['adm2_pcode'])->first();

        if (!$district) {
            return response()->json(['message' => 'District not found'], 422);
        }

        // Load current terms for this district's constituencies
        $terms = \App\Models\Term::with(['politician', 'constituency.type'])
            ->where('is_current', true)
            ->whereHas('constituency', fn ($q) => $q->where('district_id', $district->id))
            ->get();

        $mnas = $terms->filter(fn ($t) => $t->constituency->type->short_code === 'NA')->values();
        $mpas = $terms->filter(fn ($t) => $t->constituency->type->short_code !== 'NA')->values();

        $formatTerm = fn ($t) => [
            'term_id'           => $t->id,
            'constituency_code' => $t->constituency->code,
            'constituency_name' => $t->constituency->name,
            'politician_id'     => $t->politician->id,
            'politician_name'   => $t->politician->name,
            'party'             => $t->politician->party,
            'photo_url'         => $t->politician->photo_url,
        ];

        return response()->json([
            'district' => [
                'id'       => $district->id,
                'name'     => $district->name,
                'province' => $district->province->name,
            ],
            'mnas' => $mnas->map($formatTerm),
            'mpas' => $mpas->map($formatTerm),
        ]);
    }
}
