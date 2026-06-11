<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\District;
use App\Models\Province;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DistrictController extends Controller
{
    public function index(Request $request): Response
    {
        $query = District::with('province')->orderBy('name');

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")->orWhere('pcode', 'like', "%{$search}%"));
        }

        $districts = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/districts/index', [
            'districts' => $districts,
            'provinces' => Province::orderBy('name')->get(['id', 'name']),
            'filters'   => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'pcode'       => 'required|string|max:10|unique:districts,pcode',
            'name'        => 'required|string|max:100',
            'province_id' => 'required|ulid|exists:provinces,id',
            'division'    => 'nullable|string|max:100',
            'center_lat'  => 'nullable|numeric',
            'center_lon'  => 'nullable|numeric',
        ]);

        District::create($data);

        return back()->with('success', 'District created.');
    }

    public function update(Request $request, District $district): RedirectResponse
    {
        $data = $request->validate([
            'pcode'       => 'required|string|max:10|unique:districts,pcode,' . $district->id,
            'name'        => 'required|string|max:100',
            'province_id' => 'required|ulid|exists:provinces,id',
            'division'    => 'nullable|string|max:100',
            'center_lat'  => 'nullable|numeric',
            'center_lon'  => 'nullable|numeric',
        ]);

        $district->update($data);

        return back()->with('success', 'District updated.');
    }

    public function destroy(District $district): RedirectResponse
    {
        if ($district->constituencies()->exists()) {
            return back()->with('error', 'Cannot delete district with constituencies.');
        }

        $district->delete();

        return back()->with('success', 'District deleted.');
    }
}
