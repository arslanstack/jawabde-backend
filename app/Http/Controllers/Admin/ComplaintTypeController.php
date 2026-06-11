<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ComplaintType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ComplaintTypeController extends Controller
{
    public function index(): Response
    {
        $types = ComplaintType::orderBy('sort_order')->get();

        return Inertia::render('admin/complaint-types/index', [
            'types' => $types,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100|unique:complaint_types,name',
            'slug'       => 'required|string|max:100|unique:complaint_types,slug',
            'icon'       => 'nullable|string|max:50',
            'is_active'  => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        ComplaintType::create($data);

        return back()->with('success', 'Complaint type created.');
    }

    public function update(Request $request, ComplaintType $complaintType): RedirectResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100|unique:complaint_types,name,' . $complaintType->id,
            'slug'       => 'required|string|max:100|unique:complaint_types,slug,' . $complaintType->id,
            'icon'       => 'nullable|string|max:50',
            'is_active'  => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $complaintType->update($data);

        return back()->with('success', 'Complaint type updated.');
    }

    public function reorder(Request $request): RedirectResponse
    {
        $request->validate([
            'items'            => 'required|array',
            'items.*.id'       => 'required|ulid|exists:complaint_types,id',
            'items.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($request->items as $item) {
            ComplaintType::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return back()->with('success', 'Order saved.');
    }

    public function toggleActive(ComplaintType $complaintType): RedirectResponse
    {
        $complaintType->update(['is_active' => !$complaintType->is_active]);

        return back()->with('success', 'Status updated.');
    }

    public function destroy(ComplaintType $complaintType): RedirectResponse
    {
        if ($complaintType->complaints()->exists()) {
            return back()->with('error', 'Cannot delete type with existing complaints.');
        }

        $complaintType->delete();

        return back()->with('success', 'Complaint type deleted.');
    }
}
