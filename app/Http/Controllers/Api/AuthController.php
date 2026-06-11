<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MobileUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'nullable|string|max:100',
            'phone'                 => ['required', 'unique:mobile_users,phone', 'regex:/^(\+92|0)[0-9]{10}$/'],
            'password'              => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = MobileUser::create([
            'name'     => $data['name'] ?? null,
            'phone'    => $data['phone'],
            'password' => $data['password'],
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $this->userArray($user)], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        $user = MobileUser::where('phone', $data['phone'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['phone' => ['Invalid credentials.']]);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account suspended.'], 403);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $this->userArray($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'id'               => $user->id,
            'name'             => $user->name,
            'phone'            => $user->phone,
            'created_at'       => $user->created_at,
            'total_complaints' => $user->complaints()->count(),
        ]]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:100']);
        $request->user()->update($data);

        return response()->json(['data' => $this->userArray($request->user())]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string']);

        $user = MobileUser::where('phone', $request->phone)->first();

        if ($user) {
            $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $user->update([
                'phone_otp'            => $otp,
                'phone_otp_expires_at' => now()->addMinutes(10),
            ]);
            // SMS not implemented — OTP is stored only
        }

        return response()->json(['message' => 'If this number is registered, an OTP has been sent.']);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $request->validate(['phone' => 'required|string', 'otp' => 'required|string']);

        $user = MobileUser::where('phone', $request->phone)->first();

        if (!$user || $user->phone_otp !== $request->otp || now()->isAfter($user->phone_otp_expires_at)) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        return response()->json(['valid' => true]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'                 => 'required|string',
            'otp'                   => 'required|string',
            'password'              => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = MobileUser::where('phone', $data['phone'])->first();

        if (!$user || $user->phone_otp !== $data['otp'] || now()->isAfter($user->phone_otp_expires_at)) {
            return response()->json(['message' => 'Invalid or expired OTP'], 422);
        }

        $user->update([
            'password'             => $data['password'],
            'phone_otp'            => null,
            'phone_otp_expires_at' => null,
        ]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully']);
    }

    private function userArray(MobileUser $user): array
    {
        return ['id' => $user->id, 'name' => $user->name, 'phone' => $user->phone];
    }
}
