<?php

namespace App\Services;

class AuthService
{
    public function login(): void
    {
        self::log('login');
    }

    private static function log(string $message): void
    {
        // no-op for the fixture
    }

    public function unusedMethod(): void
    {
        // never called anywhere — should show up as dead code in Phase 2
    }
}
