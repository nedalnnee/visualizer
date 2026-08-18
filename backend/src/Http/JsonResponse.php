<?php

declare(strict_types=1);

namespace Visualizer\Http;

final class JsonResponse
{
    public static function send(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
