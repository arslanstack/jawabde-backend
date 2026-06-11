<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    use HasUlids;

    protected $fillable = ['pcode', 'name', 'division', 'province_id', 'center_lat', 'center_lon'];

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    public function constituencies(): HasMany
    {
        return $this->hasMany(Constituency::class);
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }
}
