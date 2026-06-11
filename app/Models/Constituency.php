<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Constituency extends Model
{
    use HasUlids;

    protected $fillable = ['code', 'name', 'type_id', 'district_id'];

    public function type(): BelongsTo
    {
        return $this->belongsTo(ConstituencyType::class, 'type_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function terms(): HasMany
    {
        return $this->hasMany(Term::class);
    }

    public function currentTerm(): HasOne
    {
        return $this->hasOne(Term::class)->where('is_current', true)->latestOfMany();
    }
}
