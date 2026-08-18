<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Visualizer\Analysis\DeadCodeAnalyzer;
use Visualizer\Extractor;
use Visualizer\Http\JsonResponse;
use Visualizer\Repository\ProjectRepository;

// Local dev tool only — CORS is wide open on purpose, don't deploy this
// front controller as-is anywhere public.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];
$repository = new ProjectRepository();

try {
    if ($path === '/api/projects' && $method === 'GET') {
        JsonResponse::send($repository->all());
    }

    if ($path === '/api/projects' && $method === 'POST') {
        $body = json_decode((string) file_get_contents('php://input'), true);
        $body = is_array($body) ? $body : [];

        $name = trim((string) ($body['name'] ?? ''));
        $projectPath = trim((string) ($body['path'] ?? ''));

        if ($name === '' || $projectPath === '') {
            JsonResponse::send(['error' => '"name" and "path" are required'], 422);
        }

        if (!is_dir($projectPath)) {
            JsonResponse::send(['error' => "Not a directory: {$projectPath}"], 422);
        }

        JsonResponse::send($repository->create($name, $projectPath), 201);
    }

    if ($path === '/api/projects' && $method === 'DELETE') {
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            $body = json_decode((string) file_get_contents('php://input'), true);
            $id = (int) ($body['id'] ?? 0);
        }
        if ($id <= 0) {
            JsonResponse::send(['error' => 'Project id is required'], 422);
        }
        $deleted = $repository->delete($id);
        JsonResponse::send(['success' => $deleted]);
    }

    if ($path === '/api/file' && $method === 'GET') {
        $projectId = (int) ($_GET['project_id'] ?? 0);
        $file = trim((string) ($_GET['file'] ?? ''));
        $project = $projectId > 0 ? $repository->find($projectId) : null;

        if ($project === null || $file === '') {
            JsonResponse::send(['error' => 'Project and file are required'], 422);
        }

        // Prevent directory traversal
        $safePath = realpath($project['path'] . DIRECTORY_SEPARATOR . $file);
        $realRoot = realpath($project['path']);

        if ($safePath === false || $realRoot === false || !str_starts_with($safePath, $realRoot) || !is_file($safePath)) {
            JsonResponse::send(['error' => 'File not found or access denied'], 404);
        }

        $content = file_get_contents($safePath);
        JsonResponse::send(['content' => $content ?: '']);
    }

    if ($path === '/api/graph' && $method === 'GET') {
        $projectId = (int) ($_GET['project_id'] ?? 0);
        $project = $projectId > 0 ? $repository->find($projectId) : null;

        if ($project === null) {
            JsonResponse::send(['error' => 'Project not found'], 404);
        }

        $graph = (new Extractor($project['path']))->extract();
        $graph = (new DeadCodeAnalyzer())->analyze($graph);

        JsonResponse::send($graph);
    }

    JsonResponse::send(['error' => 'Not found'], 404);
} catch (Throwable $e) {
    JsonResponse::send(['error' => $e->getMessage()], 500);
}
