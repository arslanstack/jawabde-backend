<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\ComplaintType;
use App\Models\Term;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintApiController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->is_active) {
            return response()->json(['message' => 'Your account has been suspended. Contact support.'], 403);
        }

        $data = $request->validate([
            'photo'            => 'required|image|mimes:jpg,jpeg,png,webp|max:10240',
            'description'      => 'nullable|string|max:1000',
            'latitude'         => 'required|numeric|between:-90,90',
            'longitude'        => 'required|numeric|between:-180,180',
            'district_id'      => 'required|ulid|exists:districts,id',
            'complaint_type_id' => 'required|ulid|exists:complaint_types,id',
            'term_ids'         => 'required|array|min:1|max:5',
            'term_ids.*'       => 'ulid|exists:terms,id',
        ]);

        // Check complaint type is active
        $type = ComplaintType::find($data['complaint_type_id']);
        if (!$type->is_active) {
            return response()->json(['message' => 'This complaint type is not available.'], 422);
        }

        // Verify terms belong to district and are current
        $terms = Term::whereIn('id', $data['term_ids'])
            ->where('is_current', true)
            ->whereHas('constituency', fn ($q) => $q->where('district_id', $data['district_id']))
            ->get();

        if ($terms->count() !== count($data['term_ids'])) {
            return response()->json(['message' => 'One or more selected politicians are not valid for this district.'], 422);
        }

        // Daily cap
        $dailyCount = Complaint::where('mobile_user_id', $user->id)
            ->whereDate('created_at', today())
            ->whereNotIn('status', ['withdrawn'])
            ->count();

        if ($dailyCount >= 5) {
            return response()->json(['message' => 'Daily complaint limit reached. You can file up to 5 complaints per day.'], 422);
        }

        // Same type + location + day
        $existingToday = Complaint::where('mobile_user_id', $user->id)
            ->where('complaint_type_id', $data['complaint_type_id'])
            ->whereDate('created_at', today())
            ->whereRaw('ROUND(latitude, 2) = ?', [round($data['latitude'], 2)])
            ->whereRaw('ROUND(longitude, 2) = ?', [round($data['longitude'], 2)])
            ->whereNotIn('status', ['withdrawn'])
            ->exists();

        if ($existingToday) {
            return response()->json(['message' => 'You have already filed a complaint of this type at this location today.'], 422);
        }

        $path = $request->file('photo')->store('complaints', 'public');

        $complaint = Complaint::create([
            'mobile_user_id'    => $user->id,
            'district_id'       => $data['district_id'],
            'complaint_type_id' => $data['complaint_type_id'],
            'photo_path'        => $path,
            'description'       => $data['description'] ?? null,
            'latitude'          => $data['latitude'],
            'longitude'         => $data['longitude'],
        ]);

        $complaint->terms()->attach($data['term_ids']);
        Term::whereIn('id', $data['term_ids'])->increment('chittar_count');

        return response()->json(['data' => $this->format($complaint->load(['complaintType', 'district', 'terms.politician', 'terms.constituency']))], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $complaints = Complaint::with(['complaintType', 'district', 'terms.politician', 'terms.constituency'])
            ->where('mobile_user_id', $request->user()->id)
            ->where('status', '!=', 'unpublished')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $complaints->map(fn ($c) => $this->format($c)),
            'meta' => ['current_page' => $complaints->currentPage(), 'per_page' => $complaints->perPage(), 'total' => $complaints->total(), 'last_page' => $complaints->lastPage()],
        ]);
    }

    public function show(Request $request, Complaint $complaint): JsonResponse
    {
        if ($complaint->mobile_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        if ($complaint->status === 'unpublished') {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $complaint->load(['complaintType', 'district', 'terms.politician', 'terms.constituency']);

        return response()->json(['data' => $this->format($complaint)]);
    }

    public function resolve(Request $request, Complaint $complaint): JsonResponse
    {
        if ($complaint->mobile_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        if ($complaint->status !== 'open') {
            return response()->json(['message' => 'Only open complaints can be resolved.'], 422);
        }

        $complaint->update(['status' => 'resolved', 'resolved_at' => now()]);

        return response()->json(['data' => $this->format($complaint)]);
    }

    public function withdraw(Request $request, Complaint $complaint): JsonResponse
    {
        if ($complaint->mobile_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        if ($complaint->status !== 'open') {
            return response()->json(['message' => 'Only open complaints can be withdrawn.'], 422);
        }

        $complaint->update(['status' => 'withdrawn']);

        return response()->json(['data' => $this->format($complaint)]);
    }

    private function format(Complaint $c): array
    {
        return [
            'id'             => $c->id,
            'status'         => $c->status,
            'photo_url'      => $c->photo_url,
            'description'    => $c->description,
            'latitude'       => $c->latitude,
            'longitude'      => $c->longitude,
            'complaint_type' => $c->complaintType->name,
            'district'       => $c->district->name,
            'created_at'     => $c->created_at,
            'resolved_at'    => $c->resolved_at,
            'politicians'    => $c->terms->map(fn ($t) => [
                'name'             => $t->politician->name,
                'constituency_code' => $t->constituency->code,
            ]),
        ];
    }
}
