<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use App\Models\ConstituencyType;
use App\Models\District;
use App\Models\Politician;
use App\Models\Province;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ConstituencyController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Constituency::with(['type', 'district.province', 'currentTerm.politician'])->orderBy('code');

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }

        $constituencies = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/constituencies/index', [
            'constituencies' => $constituencies,
            'types'          => ConstituencyType::orderBy('name')->get(['id', 'name', 'short_code']),
            'provinces'      => Province::orderBy('name')->get(['id', 'name']),
            'districts'      => District::orderBy('name')->get(['id', 'name', 'province_id']),
            'politicians'    => Politician::orderBy('name')->get(['id', 'name']),
            'filters'        => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code'         => 'required|string|max:20|unique:constituencies,code',
            'name'         => 'required|string|max:100',
            'type_id'      => 'required|ulid|exists:constituency_types,id',
            'district_id'  => 'required|ulid|exists:districts,id',
            'politician_id'=> 'nullable|ulid|exists:politicians,id',
        ]);

        $constituency = Constituency::create(\Arr::except($data, ['politician_id']));
        $this->syncCurrentTerm($constituency, $data['politician_id'] ?? null);

        return back()->with('success', 'Constituency created.');
    }

    public function update(Request $request, Constituency $constituency): RedirectResponse
    {
        $data = $request->validate([
            'code'         => 'required|string|max:20|unique:constituencies,code,' . $constituency->id,
            'name'         => 'required|string|max:100',
            'type_id'      => 'required|ulid|exists:constituency_types,id',
            'district_id'  => 'required|ulid|exists:districts,id',
            'politician_id'=> 'nullable|ulid|exists:politicians,id',
        ]);

        $constituency->update(\Arr::except($data, ['politician_id']));
        $this->syncCurrentTerm($constituency, $data['politician_id'] ?? null);

        return back()->with('success', 'Constituency updated.');
    }

    private function syncCurrentTerm(Constituency $constituency, ?string $politicianId): void
    {
        if (!$politicianId) return;

        Term::where('constituency_id', $constituency->id)->where('is_current', true)->update(['is_current' => false]);
        Term::where('politician_id', $politicianId)->where('is_current', true)->update(['is_current' => false]);

        Term::updateOrCreate(
            ['politician_id' => $politicianId, 'constituency_id' => $constituency->id, 'election_year' => 2024],
            ['is_current' => true]
        );
    }

    public function destroy(Constituency $constituency): RedirectResponse
    {
        if ($constituency->terms()->exists()) {
            return back()->with('error', 'Cannot delete constituency with existing terms.');
        }

        $constituency->delete();

        return back()->with('success', 'Constituency deleted.');
    }
}
