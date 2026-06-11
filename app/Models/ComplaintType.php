<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ComplaintType extends Model
{
    use HasUlids;

    protected $fillable = ['name', 'slug', 'icon', 'is_active', 'sort_order'];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }
}
