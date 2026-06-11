<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    use HasUlids;

    protected $fillable = ['name', 'code'];

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }
}
