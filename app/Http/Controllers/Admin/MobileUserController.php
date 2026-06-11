<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MobileUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileUserController extends Controller
{
    public function index(Request $request): Response
    {
        $query = MobileUser::withCount('complaints')->orderByDesc('created_at');

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q->where('phone', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
        }

        $users = $query->paginate(50)->withQueryString();

        return Inertia::render('admin/mobile-users/index', [
            'users'   => $users,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(MobileUser $mobileUser): Response
    {
        $complaints = $mobileUser->complaints()
            ->with(['complaintType', 'district'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('admin/mobile-users/show', [
            'user'       => $mobileUser->loadCount('complaints'),
            'complaints' => $complaints,
        ]);
    }

    public function toggleActive(MobileUser $mobileUser): RedirectResponse
    {
        $mobileUser->update(['is_active' => !$mobileUser->is_active]);

        return back()->with('success', $mobileUser->is_active ? 'User reactivated.' : 'User suspended.');
    }

    public function destroy(MobileUser $mobileUser): RedirectResponse
    {
        if ($mobileUser->complaints()->exists()) {
            return back()->with('error', 'Cannot delete user with complaints.');
        }

        $mobileUser->delete();

        return back()->with('success', 'User deleted.');
    }
}
