<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Politician;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PoliticianApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Politician::with('currentTerm.constituency.district.province');

        if ($request->filled('search')) {
            $query->whereFullText('name', $request->search);
        }
        if ($request->filled('party')) {
            $query->where('party', 'LIKE', '%' . $request->party . '%');
        }
        if ($request->filled('province')) {
            $query->whereHas('currentTerm.constituency.district.province', fn ($q) => $q->where('name', $request->province));
        }
        if ($request->filled('assembly')) {
            $query->whereHas('currentTerm.constituency.type', fn ($q) => $q->where('short_code', $request->assembly));
        }

        $perPage = min((int) ($request->per_page ?? 20), 50);
        $politicians = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => $politicians->map(fn ($p) => $this->format($p)),
            'meta' => [
                'current_page' => $politicians->currentPage(),
                'per_page'     => $politicians->perPage(),
                'total'        => $politicians->total(),
                'last_page'    => $politicians->lastPage(),
            ],
        ]);
    }

    public function show(Politician $politician): JsonResponse
    {
        $politician->load('currentTerm.constituency.district.province');

        $stats = Complaint::where('status', '!=', 'unpublished')
            ->whereHas('terms', fn ($q) => $q->where('politician_id', $politician->id))
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recentComplaints = Complaint::with(['complaintType', 'district'])
            ->where('status', 'open')
            ->whereHas('terms', fn ($q) => $q->where('politician_id', $politician->id))
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'id'             => $c->id,
                'photo_url'      => $c->photo_url,
                'description'    => $c->description,
                'complaint_type' => $c->complaintType->name,
                'district'       => $c->district->name,
                'created_at'     => $c->created_at,
            ]);

        return response()->json(['data' => [
            'id'       => $politician->id,
            'name'     => $politician->name,
            'party'    => $politician->party,
            'photo_url' => $politician->photo_url,
            'current_term' => $politician->currentTerm ? [
                'id'           => $politician->currentTerm->id,
                'constituency' => $politician->currentTerm->constituency->code,
                'district'     => $politician->currentTerm->constituency->district->name,
                'province'     => $politician->currentTerm->constituency->district->province->name,
            ] : null,
            'total_chittars'   => $politician->currentTerm?->chittar_count ?? 0,
            'complaint_stats'  => [
                'total'     => $stats->sum(),
                'open'      => $stats['open'] ?? 0,
                'resolved'  => $stats['resolved'] ?? 0,
                'withdrawn' => $stats['withdrawn'] ?? 0,
            ],
            'recent_complaints' => $recentComplaints,
        ]]);
    }

    private function format(Politician $p): array
    {
        return [
            'id'           => $p->id,
            'name'         => $p->name,
            'party'        => $p->party,
            'photo_url'    => $p->photo_url,
            'current_term' => $p->currentTerm ? [
                'constituency' => $p->currentTerm->constituency->code,
                'chittar_count' => $p->currentTerm->chittar_count,
            ] : null,
        ];
    }
}
