<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(private SearchService $search) {}

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q'     => 'required|string|min:2',
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $limit = min((int) ($request->limit ?? 5), 20);
        $results = $this->search->search($request->q, $limit);

        return response()->json([
            'query'   => $request->q,
            'results' => $results,
            'total'   => $results['total'],
        ]);
    }
}
