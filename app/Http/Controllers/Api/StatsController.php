<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\District;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    public function leaderboard(Request $request): JsonResponse
    {
        $request->validate([
            'province' => 'nullable|string',
            'assembly' => 'nullable|string',
            'period'   => 'nullable|in:week,month,all',
            'limit'    => 'nullable|integer|min:1|max:50',
        ]);

        $period = $request->period ?? 'all';
        $limit  = min((int) ($request->limit ?? 20), 50);

        $query = Term::with(['politician', 'constituency.type'])
            ->where('is_current', true);

        if ($request->filled('province')) {
            $query->whereHas('constituency.district.province', fn ($q) => $q->where('name', $request->province));
        }
        if ($request->filled('assembly')) {
            $query->whereHas('constituency.type', fn ($q) => $q->where('short_code', $request->assembly));
        }

        if ($period === 'all') {
            $results = $query->orderByDesc('chittar_count')->limit($limit)->get();
            $items = $results->map(fn ($t, $i) => [
                'rank'         => $i + 1,
                'politician'   => $t->politician->name,
                'party'        => $t->politician->party,
                'constituency' => $t->constituency->code,
                'chittar_count' => $t->chittar_count,
            ]);
        } else {
            $since = $period === 'week' ? now()->startOfWeek() : now()->startOfMonth();

            $items = Term::join('complaint_terms', 'terms.id', '=', 'complaint_terms.term_id')
                ->join('complaints', function ($join) use ($since) {
                    $join->on('complaint_terms.complaint_id', '=', 'complaints.id')
                         ->where('complaints.created_at', '>=', $since)
                         ->where('complaints.status', '!=', 'unpublished');
                })
                ->where('terms.is_current', true)
                ->select('terms.id', DB::raw('COUNT(complaint_terms.complaint_id) as period_count'))
                ->groupBy('terms.id')
                ->orderByDesc('period_count')
                ->limit($limit)
                ->with(['politician', 'constituency'])
                ->get()
                ->map(fn ($t, $i) => [
                    'rank'         => $i + 1,
                    'politician'   => $t->politician->name,
                    'party'        => $t->politician->party,
                    'constituency' => $t->constituency->code,
                    'chittar_count' => $t->period_count,
                ]);
        }

        return response()->json(['data' => $items]);
    }

    public function summary(): JsonResponse
    {
        $data = Cache::remember('stats:summary', 300, function () {
            $mostChittared = Term::with(['politician', 'constituency'])
                ->where('is_current', true)
                ->join('complaint_terms', 'terms.id', '=', 'complaint_terms.term_id')
                ->join('complaints', function ($join) {
                    $join->on('complaint_terms.complaint_id', '=', 'complaints.id')
                         ->where('complaints.created_at', '>=', now()->startOfWeek());
                })
                ->select('terms.*', DB::raw('COUNT(*) as week_count'))
                ->groupBy('terms.id')
                ->orderByDesc('week_count')
                ->first();

            $mostActiveDistrict = Complaint::select('district_id', DB::raw('COUNT(*) as count'))
                ->where('created_at', '>=', now()->startOfWeek())
                ->groupBy('district_id')
                ->orderByDesc('count')
                ->with('district')
                ->first();

            return [
                'total_complaints'    => Complaint::count(),
                'total_chittars_sent' => Term::sum('chittar_count'),
                'total_politicians'   => \App\Models\Politician::count(),
                'most_chittared_this_week' => $mostChittared ? ['name' => $mostChittared->politician->name, 'count' => $mostChittared->week_count, 'constituency' => $mostChittared->constituency->code] : null,
                'most_active_district' => $mostActiveDistrict ? ['name' => $mostActiveDistrict->district->name, 'complaint_count' => $mostActiveDistrict->count] : null,
                'complaints_today'    => Complaint::whereDate('created_at', today())->count(),
                'complaints_this_week' => Complaint::where('created_at', '>=', now()->startOfWeek())->count(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function district(District $district): JsonResponse
    {
        $topTerms = Term::with(['politician', 'constituency'])
            ->where('is_current', true)
            ->whereHas('constituency', fn ($q) => $q->where('district_id', $district->id))
            ->orderByDesc('chittar_count')
            ->limit(3)
            ->get();

        $recentComplaints = Complaint::with(['complaintType'])
            ->where('district_id', $district->id)
            ->where('status', '!=', 'unpublished')
            ->latest()
            ->limit(10)
            ->get();

        return response()->json(['data' => [
            'district'          => $district->name,
            'total_complaints'  => Complaint::where('district_id', $district->id)->count(),
            'top_politicians'   => $topTerms->map(fn ($t) => ['name' => $t->politician->name, 'constituency' => $t->constituency->code, 'chittars' => $t->chittar_count]),
            'recent_complaints' => $recentComplaints->map(fn ($c) => ['id' => $c->id, 'type' => $c->complaintType->name, 'status' => $c->status, 'created_at' => $c->created_at]),
        ]]);
    }

    public function politician(Politician $politician): JsonResponse
    {
        // Monthly breakdown last 6 months
        $monthly = DB::table('complaints')
            ->join('complaint_terms', 'complaints.id', '=', 'complaint_terms.complaint_id')
            ->join('terms', 'complaint_terms.term_id', '=', 'terms.id')
            ->where('terms.politician_id', $politician->id)
            ->where('complaints.created_at', '>=', now()->subMonths(6))
            ->where('complaints.status', '!=', 'unpublished')
            ->selectRaw('YEAR(complaints.created_at) as year, MONTH(complaints.created_at) as month, COUNT(*) as count')
            ->groupByRaw('year, month')
            ->orderByRaw('year, month')
            ->get();

        // Type breakdown
        $byType = DB::table('complaints')
            ->join('complaint_terms', 'complaints.id', '=', 'complaint_terms.complaint_id')
            ->join('terms', 'complaint_terms.term_id', '=', 'terms.id')
            ->join('complaint_types', 'complaints.complaint_type_id', '=', 'complaint_types.id')
            ->where('terms.politician_id', $politician->id)
            ->where('complaints.status', '!=', 'unpublished')
            ->selectRaw('complaint_types.name, COUNT(*) as count')
            ->groupBy('complaint_types.name')
            ->orderByDesc('count')
            ->get();

        $total = Complaint::whereHas('terms', fn ($q) => $q->where('politician_id', $politician->id))->where('status', '!=', 'unpublished')->count();
        $resolved = Complaint::whereHas('terms', fn ($q) => $q->where('politician_id', $politician->id))->where('status', 'resolved')->count();

        return response()->json(['data' => [
            'politician'       => $politician->name,
            'monthly_chittars' => $monthly,
            'type_breakdown'   => $byType,
            'resolution_rate'  => $total > 0 ? round($resolved / $total * 100, 1) : 0,
        ]]);
    }
}
