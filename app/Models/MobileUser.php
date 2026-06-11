<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class MobileUser extends Authenticatable
{
    use HasApiTokens, HasUlids, Notifiable;

    protected $table = 'mobile_users';

    protected $fillable = [
        'name', 'phone', 'password', 'is_active',
        'email', 'email_verified_at', 'phone_otp', 'phone_otp_expires_at',
    ];

    protected $hidden = ['password', 'remember_token', 'phone_otp'];

    protected $casts = [
        'is_active' => 'boolean',
        'email_verified_at' => 'datetime',
        'phone_otp_expires_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class, 'mobile_user_id');
    }
}
