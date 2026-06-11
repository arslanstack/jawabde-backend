<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use Illuminate\Http\JsonResponse;

class ConstituencyApiController extends Controller
{
    public function index(): JsonResponse
    {
        $constituencies = Constituency::with(['type', 'district.province', 'currentTerm.politician'])
            ->orderBy('code')
            ->paginate(50);

        return response()->json([
            'data' => $constituencies->map(fn ($c) => $this->format($c)),
            'meta' => [
                'current_page' => $constituencies->currentPage(),
                'per_page'     => $constituencies->perPage(),
                'total'        => $constituencies->total(),
                'last_page'    => $constituencies->lastPage(),
            ],
        ]);
    }

    public function show(Constituency $constituency): JsonResponse
    {
        $constituency->load(['type', 'district.province', 'currentTerm.politician']);

        return response()->json(['data' => $this->format($constituency)]);
    }

    private function format(Constituency $c): array
    {
        return [
            'id'           => $c->id,
            'code'         => $c->code,
            'name'         => $c->name,
            'type'         => $c->type->short_code,
            'district'     => $c->district->name,
            'province'     => $c->district->province->name,
            'current_rep'  => $c->currentTerm?->politician?->name,
        ];
    }
}
