<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\ArchiveController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeedCaseController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => auth()->check()
    ? redirect()->route('dashboard')
    : redirect()->route('login')
)->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Data Klien
    Route::resource('clients', ClientController::class);

    // Monitoring Proses Akta (10 Tahapan)
    Route::resource('cases', DeedCaseController::class)->except(['create', 'edit']);
    Route::post('cases/{case}/advance', [DeedCaseController::class, 'advance'])->name('cases.advance');
    Route::post('cases/{case}/skip', [DeedCaseController::class, 'skip'])->name('cases.skip');
    Route::post('cases/{case}/revert', [DeedCaseController::class, 'revert'])->name('cases.revert');
    Route::post('cases/{case}/request-doc-approval', [DeedCaseController::class, 'requestDocApproval'])->name('cases.request-doc-approval');
    Route::post('cases/{case}/approve-doc', [DeedCaseController::class, 'approveDocVerification'])->name('cases.approve-doc');
    Route::post('cases/{case}/reject-doc', [DeedCaseController::class, 'rejectDocVerification'])->name('cases.reject-doc');
    Route::post('cases/{case}/request-draft', [DeedCaseController::class, 'requestDraft'])->name('cases.request-draft');
    Route::post('cases/{case}/approve-draft', [DeedCaseController::class, 'approveDraft'])->name('cases.approve-draft');
    Route::post('cases/{case}/request-revision', [DeedCaseController::class, 'requestRevision'])->name('cases.request-revision');

    // Manajemen Dokumen & Lampiran Privat
    Route::resource('documents', DocumentController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('documents/{document}/verify', [DocumentController::class, 'verify'])->name('documents.verify');
    Route::post('documents/{document}/reject', [DocumentController::class, 'reject'])->name('documents.reject');
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');

    // Pengarsipan
    Route::get('archives', [ArchiveController::class, 'index'])->name('archives.index');
    Route::post('archives/cases/{deedCase}/bast', [ArchiveController::class, 'uploadBast'])->name('archives.upload-bast');

    // Keuangan & Termin Pembayaran (DP 50% & Pelunasan)
    Route::resource('payments', PaymentController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('payments/{payment}/submit-proof', [PaymentController::class, 'submitProof'])->name('payments.submit-proof');
    Route::post('payments/{payment}/confirm', [PaymentController::class, 'confirm'])->name('payments.confirm');
    Route::post('payments/{payment}/reject', [PaymentController::class, 'reject'])->name('payments.reject');
    Route::post('payments/{payment}/cancel-confirm', [PaymentController::class, 'cancelConfirm'])->name('payments.cancel-confirm');
    Route::get('payments/{payment}/proof', [PaymentController::class, 'downloadProof'])->name('payments.proof');

    // Persetujuan Khusus Notaris & Log Aktivitas
    Route::get('approvals', [ApprovalController::class, 'index'])->name('approvals.index');
    Route::post('approvals/cancel', [ApprovalController::class, 'cancel'])->name('approvals.cancel');
    Route::delete('approvals/remove', [ApprovalController::class, 'remove'])->name('approvals.remove');
    Route::get('activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');
});

require __DIR__.'/settings.php';
