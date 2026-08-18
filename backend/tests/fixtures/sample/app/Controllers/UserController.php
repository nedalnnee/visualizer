<?php

namespace App\Controllers;

use App\Services\AuthService;

class UserController
{
    public function __construct(private AuthService $auth)
    {
    }

    public function store(): void
    {
        $this->validate();
        $this->auth->login();
    }

    private function validate(): void
    {
        // no-op for the fixture
    }
}
