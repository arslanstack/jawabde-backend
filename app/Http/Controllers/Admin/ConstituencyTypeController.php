<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ConstituencyType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConstituencyTypeController extends Controller
{
    public function index(): Response
    {
        $types = ConstituencyType::withCount('constituencies')->orderBy('name')->get();

        return Inertia::render('admin/constituency-types/index', [
            'types' => $types,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100|unique:constituency_types,name',
            'short_code' => 'required|string|max:5|unique:constituency_types,short_code',
            'level'      => 'required|in:national,provincial',
        ]);

        ConstituencyType::create($data);

        return back()->with('success', 'Constituency type created.');
    }

    public function update(Request $request, ConstituencyType $constituencyType): RedirectResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100|unique:constituency_types,name,' . $constituencyType->id,
            'short_code' => 'required|string|max:5|unique:constituency_types,short_code,' . $constituencyType->id,
            'level'      => 'required|in:national,provincial',
        ]);

        $constituencyType->update($data);

        return back()->with('success', 'Constituency type updated.');
    }

    public function destroy(ConstituencyType $constituencyType): RedirectResponse
    {
        if ($constituencyType->constituencies()->exists()) {
            return back()->with('error', 'Cannot delete type with existing constituencies.');
        }

        $constituencyType->delete();

        return back()->with('success', 'Constituency type deleted.');
    }
}
