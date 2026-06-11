<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Complaint extends Model
{
    use HasUlids;

    protected $fillable = [
        'mobile_user_id', 'district_id', 'complaint_type_id',
        'photo_path', 'description', 'latitude', 'longitude',
        'status', 'resolved_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'resolved_at' => 'datetime',
    ];

    public function mobileUser(): BelongsTo
    {
        return $this->belongsTo(MobileUser::class, 'mobile_user_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function complaintType(): BelongsTo
    {
        return $this->belongsTo(ComplaintType::class);
    }

    public function terms(): BelongsToMany
    {
        return $this->belongsToMany(Term::class, 'complaint_terms');
    }

    public function getPhotoUrlAttribute(): string
    {
        return asset('storage/' . $this->photo_path);
    }
}
