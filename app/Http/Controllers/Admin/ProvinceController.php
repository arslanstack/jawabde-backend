<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Province;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProvinceController extends Controller
{
    public function index(): Response
    {
        $provinces = Province::withCount('districts')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/provinces/index', [
            'provinces' => $provinces,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:provinces,name',
            'code' => 'required|string|max:5|unique:provinces,code',
        ]);

        Province::create($data);

        return back()->with('success', 'Province created.');
    }

    public function update(Request $request, Province $province): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:provinces,name,' . $province->id,
            'code' => 'required|string|max:5|unique:provinces,code,' . $province->id,
        ]);

        $province->update($data);

        return back()->with('success', 'Province updated.');
    }

    public function destroy(Province $province): RedirectResponse
    {
        if ($province->districts()->exists()) {
            return back()->with('error', 'Cannot delete province with existing districts.');
        }

        $province->delete();

        return back()->with('success', 'Province deleted.');
    }
}
