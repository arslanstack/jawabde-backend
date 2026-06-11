<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintType;
use App\Models\District;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ComplaintController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Complaint::with([
            'mobileUser',
            'district',
            'complaintType',
            'terms.politician',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('district_id')) {
            $query->where('district_id', $request->district_id);
        }
        if ($request->filled('complaint_type_id')) {
            $query->where('complaint_type_id', $request->complaint_type_id);
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->to);
        }

        $complaints = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return Inertia::render('admin/complaints/index', [
            'complaints'      => $complaints,
            'districts'       => District::orderBy('name')->get(['id', 'name']),
            'complaint_types' => ComplaintType::orderBy('sort_order')->get(['id', 'name']),
            'filters'         => $request->only(['status', 'district_id', 'complaint_type_id', 'from', 'to']),
        ]);
    }

    public function updateStatus(Request $request, Complaint $complaint): RedirectResponse
    {
        $data = $request->validate([
            'status' => 'required|in:open,resolved,withdrawn,unpublished',
        ]);

        $update = ['status' => $data['status']];
        if ($data['status'] === 'resolved' && !$complaint->resolved_at) {
            $update['resolved_at'] = now();
        }

        $complaint->update($update);

        return back()->with('success', 'Complaint status updated.');
    }

    public function destroy(Complaint $complaint): RedirectResponse
    {
        // Decrement chittar_count on linked terms
        $termIds = $complaint->terms()->pluck('terms.id');
        if ($termIds->isNotEmpty()) {
            \App\Models\Term::whereIn('id', $termIds)->decrement('chittar_count');
        }

        $complaint->delete();

        return back()->with('success', 'Complaint deleted.');
    }
}
