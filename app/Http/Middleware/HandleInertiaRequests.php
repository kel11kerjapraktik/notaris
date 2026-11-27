<?php

namespace App\Http\Middleware;

use App\Enums\DeedStage;
use App\Enums\DraftStatus;
use App\Enums\PaymentStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
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
            'notarisConfig' => [
                'office' => config('notaris.office'),
                'stages' => DeedStage::toFrontendList(),
                'jenisAkta' => config('notaris.jenis_akta'),
                'kategoriDokumen' => config('notaris.kategori_dokumen'),
                'bentukBadan' => config('notaris.bentuk_badan'),
                'maxFileKb' => config('notaris.max_file_kb'),
            ],
            'pendingApprovalsCount' => function () use ($user): int {
                if (! $user) {
                    return 0;
                }

                if ($user->isNotaris()) {
                    $row = DB::selectOne(
                        'SELECT
                            (SELECT COUNT(*) FROM payments WHERE status = ?) +
                            (SELECT COUNT(*) FROM deed_cases WHERE draft_status = ?) +
                            (SELECT COUNT(*) FROM deed_cases WHERE doc_approval_status = ?) +
                            (SELECT COUNT(*) FROM documents d WHERE d.is_verified = ? AND d.is_rejected = ?
                                AND NOT EXISTS (
                                    SELECT 1 FROM deed_cases dc WHERE dc.id = d.deed_case_id
                                    AND (dc.doc_approval_status IN (?, ?) OR dc.draft_status IN (?, ?))
                                )
                            ) AS total',
                        [
                            PaymentStatus::MENUNGGU->value,
                            DraftStatus::PENDING_APPROVAL->value,
                            'pending_approval',
                            false,
                            false,
                            'pending_approval',
                            'rejected',
                            DraftStatus::PENDING_APPROVAL->value,
                            DraftStatus::REVISION_REQUESTED->value,
                        ],
                    );

                    return (int) ($row->total ?? 0);
                }

                $row = DB::selectOne(
                    'SELECT COUNT(*) AS total FROM documents d WHERE d.is_verified = ?
                        AND NOT EXISTS (
                            SELECT 1 FROM deed_cases dc WHERE dc.id = d.deed_case_id
                            AND (dc.doc_approval_status IN (?, ?) OR dc.draft_status IN (?, ?))
                        )',
                    [
                        false,
                        'pending_approval',
                        'rejected',
                        DraftStatus::PENDING_APPROVAL->value,
                        DraftStatus::REVISION_REQUESTED->value,
                    ],
                );

                return (int) ($row->total ?? 0);
            },
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
