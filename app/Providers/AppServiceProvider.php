<?php

namespace App\Providers;

use App\Models\Client;
use App\Models\ClientCompany;
use App\Models\DeedCase;
use App\Models\Document;
use App\Models\Payment;
use App\Models\User;
use App\Services\NotarisStatsService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Gate::define('notaris', fn (User $user): bool => $user->isNotaris());

        $this->registerCacheInvalidation();
    }

    protected function registerCacheInvalidation(): void
    {
        Client::saved(fn () => NotarisStatsService::flush(resetOrphanCheck: true));
        Client::deleted(fn () => NotarisStatsService::flush(resetOrphanCheck: true));
        ClientCompany::saved(fn () => NotarisStatsService::flush());
        ClientCompany::deleted(fn () => NotarisStatsService::flush());
        DeedCase::saved(fn () => NotarisStatsService::flush());
        DeedCase::deleted(fn () => NotarisStatsService::flush(resetOrphanCheck: true));
        Document::saved(fn () => NotarisStatsService::flush());
        Document::deleted(fn () => NotarisStatsService::flush());
        Payment::saved(fn () => NotarisStatsService::flush());
        Payment::deleted(fn () => NotarisStatsService::flush());
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
