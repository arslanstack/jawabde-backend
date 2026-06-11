<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\MobileUser;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $totalComplaints = Complaint::count();
        $openComplaints = Complaint::where('status', 'open')->count();
        $resolvedComplaints = Complaint::where('status', 'resolved')->count();
        $unpublishedComplaints = Complaint::where('status', 'unpublished')->count();
        $totalChittars = Term::sum('chittar_count');
        $totalUsers = MobileUser::count();

        $complaintsToday = Complaint::whereDate('created_at', today())->count();
        $complaintsThisWeek = Complaint::whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])->count();
        $complaintsThisMonth = Complaint::whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->count();

        $mostChittared = Term::with(['politician', 'constituency'])
            ->join('complaint_terms', 'terms.id', '=', 'complaint_terms.term_id')
            ->join('complaints', function ($join) {
                $join->on('complaint_terms.complaint_id', '=', 'complaints.id')
                     ->whereBetween('complaints.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
            })
            ->select('terms.*', DB::raw('COUNT(complaint_terms.complaint_id) as week_count'))
            ->groupBy('terms.id')
            ->orderByDesc('week_count')
            ->first();

        $mostActiveDistrict = Complaint::select('district_id', DB::raw('COUNT(*) as complaint_count'))
            ->with('district')
            ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->groupBy('district_id')
            ->orderByDesc('complaint_count')
            ->first();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'total_complaints'    => $totalComplaints,
                'open_complaints'     => $openComplaints,
                'resolved_complaints' => $resolvedComplaints,
                'unpublished_complaints' => $unpublishedComplaints,
                'total_chittars'      => $totalChittars,
                'total_users'         => $totalUsers,
                'complaints_today'    => $complaintsToday,
                'complaints_this_week' => $complaintsThisWeek,
                'complaints_this_month' => $complaintsThisMonth,
                'most_chittared_politician' => $mostChittared ? [
                    'name'         => $mostChittared->politician->name,
                    'count'        => $mostChittared->week_count,
                    'constituency' => $mostChittared->constituency->code,
                ] : null,
                'most_active_district' => $mostActiveDistrict ? [
                    'name'  => $mostActiveDistrict->district->name,
                    'count' => $mostActiveDistrict->complaint_count,
                ] : null,
            ],
        ]);
    }
}
