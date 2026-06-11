<?php

namespace App\Services;

use App\Models\Constituency;
use App\Models\District;
use App\Models\Politician;
use Illuminate\Support\Facades\DB;

class SearchService
{
    public function search(string $query, int $limit = 5): array
    {
        $districts = $this->searchDistricts($query, $limit);
        $constituencies = $this->searchConstituencies($query, $limit);
        $politicians = $this->searchPoliticians($query, $limit);

        return [
            'districts'      => $districts,
            'constituencies' => $constituencies,
            'politicians'    => $politicians,
            'total'          => count($districts) + count($constituencies) + count($politicians),
        ];
    }

    private function searchDistricts(string $query, int $limit): array
    {
        return District::with('province')
            ->whereFullText('name', $query)
            ->limit($limit)
            ->get()
            ->map(fn ($d) => [
                'type'  => 'district',
                'id'    => $d->id,
                'label' => $d->name . ', ' . $d->province->name,
            ])
            ->toArray();
    }

    private function searchConstituencies(string $query, int $limit): array
    {
        $results = Constituency::with(['type', 'district', 'currentTerm.politician'])
            ->where(function ($q) use ($query) {
                $q->whereFullText('name', $query)
                  ->orWhere('code', 'LIKE', $query . '%');
            })
            ->limit($limit)
            ->get();

        return $results->map(fn ($c) => [
            'type'         => 'constituency',
            'id'           => $c->id,
            'label'        => $c->code . ' — ' . $c->name,
            'current_rep'  => $c->currentTerm?->politician?->name,
        ])->toArray();
    }

    private function searchPoliticians(string $query, int $limit): array
    {
        return Politician::with('currentTerm.constituency')
            ->whereFullText('name', $query)
            ->limit($limit)
            ->get()
            ->map(fn ($p) => [
                'type'      => 'politician',
                'id'        => $p->id,
                'label'     => $p->name . ($p->currentTerm?->constituency ? ' — ' . $p->currentTerm->constituency->code : ''),
                'photo_url' => $p->photo_url,
            ])
            ->toArray();
    }
}
