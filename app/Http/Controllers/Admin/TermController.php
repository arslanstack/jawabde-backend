<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use App\Models\Politician;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TermController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Term::with(['politician', 'constituency.type'])
            ->orderByDesc('is_current')
            ->orderByDesc('election_year');

        if ($search = $request->get('search')) {
            $query->whereHas('politician', fn($q) => $q->where('name', 'like', "%{$search}%"))
                  ->orWhereHas('constituency', fn($q) => $q->where('code', 'like', "%{$search}%"));
        }

        $terms = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/terms/index', [
            'terms'          => $terms,
            'politicians'    => Politician::orderBy('name')->get(['id', 'name']),
            'constituencies' => Constituency::orderBy('code')->get(['id', 'code', 'name']),
            'filters'        => ['search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'politician_id'    => 'required|ulid|exists:politicians,id',
            'constituency_id'  => 'required|ulid|exists:constituencies,id',
            'election_year'    => 'required|integer|min:1900|max:2100',
            'is_current'       => 'boolean',
        ]);

        Term::create($data);

        return back()->with('success', 'Term created.');
    }

    public function update(Request $request, Term $term): RedirectResponse
    {
        $data = $request->validate([
            'politician_id'   => 'required|ulid|exists:politicians,id',
            'constituency_id' => 'required|ulid|exists:constituencies,id',
            'election_year'   => 'required|integer|min:1900|max:2100',
            'is_current'      => 'boolean',
        ]);

        $term->update($data);

        return back()->with('success', 'Term updated.');
    }

    public function destroy(Term $term): RedirectResponse
    {
        if ($term->complaints()->exists()) {
            return back()->with('error', 'Cannot delete term with linked complaints.');
        }

        $term->delete();

        return back()->with('success', 'Term deleted.');
    }
}
