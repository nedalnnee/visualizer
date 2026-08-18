<?php

namespace App\Services;

use App\Support\Logger;

class AuthService
{
    public function login(): void
    {
        self::log('login');
    }

    private static function log(string $message): void
    {
        Logger::write($message);
    }

    public function unusedMethod(): void
    {
        // never called anywhere — should show up as dead code in Phase 2
    }
}
