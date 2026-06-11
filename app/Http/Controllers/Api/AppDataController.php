<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintType;
use App\Models\Constituency;
use App\Models\ConstituencyType;
use App\Models\District;
use App\Models\Politician;
use App\Models\Province;
use Illuminate\Support\Facades\Cache;

class AppDataController extends Controller
{
    public function version()
    {
        $hash = Cache::remember('app_data_version', 3600, fn () => $this->computeHash());

        return response()->json([
            'version'      => $hash,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function seed()
    {
        $payload = Cache::remember('app_data_seed', 3600, function () {
            $provinces = Province::orderBy('name')
                ->get(['id', 'name', 'code']);

            $districts = District::with('province:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'province_id', 'center_lat', 'center_lon'])
                ->map(fn ($d) => [
                    'id'          => $d->id,
                    'name'        => $d->name,
                    'province_id' => $d->province_id,
                    'province'    => $d->province?->name,
                    'center_lat'  => $d->center_lat,
                    'center_lon'  => $d->center_lon,
                ]);

            $constituencyTypes = ConstituencyType::orderBy('name')
                ->get(['id', 'name', 'short_code', 'level']);

            $constituencies = Constituency::with('type:id,short_code')
                ->orderBy('code')
                ->get(['id', 'code', 'name', 'type_id', 'district_id'])
                ->map(fn ($c) => [
                    'id'          => $c->id,
                    'code'        => $c->code,
                    'name'        => $c->name,
                    'type_id'     => $c->type_id,
                    'short_code'  => $c->type?->short_code,
                    'district_id' => $c->district_id,
                ]);

            $politicians = Politician::with([
                'terms' => fn ($q) => $q->where('is_current', true)
                                        ->with('constituency:id,code,district_id'),
            ])
                ->whereHas('terms', fn ($q) => $q->where('is_current', true))
                ->orderBy('name')
                ->get()
                ->map(function ($p) {
                    $term = $p->terms->first();
                    return [
                        'id'               => $p->id,
                        'name'             => $p->name,
                        'party'            => $p->party,
                        'photo_url'        => $p->photo_url,
                        'constituency_code'=> $term?->constituency?->code,
                        'constituency_id'  => $term?->constituency?->id,
                        'district_id'      => $term?->constituency?->district_id,
                        'term_id'          => $term?->id,
                    ];
                });

            $complaintTypes = ComplaintType::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'slug', 'icon', 'sort_order']);

            return compact(
                'provinces',
                'districts',
                'constituencyTypes',
                'constituencies',
                'politicians',
                'complaintTypes'
            );
        });

        return response()->json([
            'version'            => Cache::remember('app_data_version', 3600, fn () => $this->computeHash()),
            'provinces'          => $payload['provinces'],
            'districts'          => $payload['districts'],
            'constituency_types' => $payload['constituencyTypes'],
            'constituencies'     => $payload['constituencies'],
            'politicians'        => $payload['politicians'],
            'complaint_types'    => $payload['complaintTypes'],
        ]);
    }

    private function computeHash(): string
    {
        $politiciansCount    = Politician::count();
        $districtsCount      = District::count();
        $constituenciesCount = Constituency::count();
        $complaintTypesCount = ComplaintType::where('is_active', true)->count();

        $latestUpdate = max(
            Politician::max('updated_at')    ?? '',
            District::max('updated_at')      ?? '',
            Constituency::max('updated_at')  ?? '',
            ComplaintType::max('updated_at') ?? '',
        );

        return md5($politiciansCount . $districtsCount . $constituenciesCount . $complaintTypesCount . $latestUpdate);
    }
}
