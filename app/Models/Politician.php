<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Politician extends Model
{
    use HasUlids;

    protected $fillable = ['name', 'party', 'photo_path'];

    protected $appends = ['photo_url'];

    public function terms(): HasMany
    {
        return $this->hasMany(Term::class);
    }

    public function currentTerm(): HasOne
    {
        return $this->hasOne(Term::class)->where('is_current', true)->latestOfMany();
    }

    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path ? asset('storage/' . $this->photo_path) : null;
    }
}
