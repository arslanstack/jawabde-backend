<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConstituencyType extends Model
{
    use HasUlids;

    protected $fillable = ['name', 'short_code', 'level'];

    public function constituencies(): HasMany
    {
        return $this->hasMany(Constituency::class, 'type_id');
    }
}
