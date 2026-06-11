<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Term extends Model
{
    use HasUlids;

    protected $fillable = ['politician_id', 'constituency_id', 'election_year', 'is_current', 'chittar_count'];

    protected $casts = [
        'is_current' => 'boolean',
        'chittar_count' => 'integer',
        'election_year' => 'integer',
    ];

    public function politician(): BelongsTo
    {
        return $this->belongsTo(Politician::class);
    }

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class);
    }

    public function complaints(): BelongsToMany
    {
        return $this->belongsToMany(Complaint::class, 'complaint_terms');
    }
}
