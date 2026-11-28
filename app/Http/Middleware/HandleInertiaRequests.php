<?php

namespace App\Http\Middleware;

use App\Enums\DeedStage;
use App\Services\NotarisStatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function __construct(
        private readonly NotarisStatsService $stats,
    ) {}

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role->value,
                    'role_label' => $user->role->label(),
                    'is_notaris' => $user->isNotaris(),
                ] : null,
            ],
            'notarisConfig' => Inertia::once(fn (): array => [
                'office' => config('notaris.office'),
                'stages' => DeedStage::toFrontendList(),
                'jenisAkta' => config('notaris.jenis_akta'),
                'kategoriDokumen' => config('notaris.kategori_dokumen'),
                'bentukBadan' => config('notaris.bentuk_badan'),
                'maxFileKb' => config('notaris.max_file_kb'),
            ]),
            'pendingApprovalsCount' => fn (): int => $user
                ? $this->stats->pendingApprovalsCount($user->isNotaris())
                : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
