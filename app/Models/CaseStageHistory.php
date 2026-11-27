<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseStageHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'deed_case_id',
        'stage_order',
        'stage_key',
        'action',
        'notes',
        'acted_by',
    ];

    protected function casts(): array
    {
        return [
            'stage_order' => 'integer',
        ];
    }

    public function deedCase(): BelongsTo
    {
        return $this->belongsTo(DeedCase::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acted_by');
    }
}
