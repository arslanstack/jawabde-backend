<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PoliticianController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Politician::with(['currentTerm.constituency.type'])
            ->withSum('terms', 'chittar_count')
            ->orderBy('name');

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")->orWhere('party', 'like', "%{$search}%"));
        }

        $politicians = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/politicians/index', [
            'politicians'    => $politicians,
            'constituencies' => Constituency::orderBy('code')->get(['id', 'code', 'name']),
            'filters'        => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:150',
            'party'           => 'nullable|string|max:100',
            'photo'           => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'constituency_id' => 'nullable|ulid|exists:constituencies,id',
        ]);

        $politician = Politician::create(['name' => $data['name'], 'party' => $data['party'] ?? null]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('politicians', 'public');
            $politician->update(['photo_path' => $path]);
        }

        $this->syncCurrentTerm($politician, $data['constituency_id'] ?? null);

        return back()->with('success', 'Politician created.');
    }

    public function update(Request $request, Politician $politician): RedirectResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:150',
            'party'           => 'nullable|string|max:100',
            'photo'           => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_photo'    => 'nullable|boolean',
            'constituency_id' => 'nullable|ulid|exists:constituencies,id',
        ]);

        $politician->update(['name' => $data['name'], 'party' => $data['party'] ?? null]);

        if ($request->boolean('remove_photo') && $politician->photo_path) {
            Storage::disk('public')->delete($politician->photo_path);
            $politician->update(['photo_path' => null]);
        } elseif ($request->hasFile('photo')) {
            if ($politician->photo_path) Storage::disk('public')->delete($politician->photo_path);
            $path = $request->file('photo')->store('politicians', 'public');
            $politician->update(['photo_path' => $path]);
        }

        if (array_key_exists('constituency_id', $data)) {
            $this->syncCurrentTerm($politician, $data['constituency_id']);
        }

        return back()->with('success', 'Politician updated.');
    }

    private function syncCurrentTerm(Politician $politician, ?string $constituencyId): void
    {
        if (!$constituencyId) return;

        Term::where('constituency_id', $constituencyId)->where('is_current', true)->update(['is_current' => false]);
        Term::where('politician_id', $politician->id)->where('is_current', true)->update(['is_current' => false]);

        Term::updateOrCreate(
            ['politician_id' => $politician->id, 'constituency_id' => $constituencyId, 'election_year' => 2024],
            ['is_current' => true]
        );
    }

    public function destroy(Politician $politician): RedirectResponse
    {
        if ($politician->terms()->exists()) {
            return back()->with('error', 'Cannot delete politician with existing terms.');
        }

        if ($politician->photo_path) {
            Storage::disk('public')->delete($politician->photo_path);
        }

        $politician->delete();

        return back()->with('success', 'Politician deleted.');
    }
}
