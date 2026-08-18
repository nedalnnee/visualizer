<?php

declare(strict_types=1);

namespace Visualizer\Repository;

use PDO;
use Visualizer\Db;

final class ProjectRepository
{
    /** @return list<array{id: int, name: string, path: string, created_at: string}> */
    public function all(): array
    {
        $stmt = Db::connection()->query('SELECT id, name, path, created_at FROM projects ORDER BY name');
        $rows = $stmt !== false ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];

        return array_map($this->normalize(...), $rows);
    }

    /** @return array{id: int, name: string, path: string, created_at: string}|null */
    public function find(int $id): ?array
    {
        $stmt = Db::connection()->prepare('SELECT id, name, path, created_at FROM projects WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : $this->normalize($row);
    }

    /** @return array{id: int, name: string, path: string, created_at: string} */
    public function create(string $name, string $path): array
    {
        $stmt = Db::connection()->prepare('INSERT INTO projects (name, path) VALUES (:name, :path)');
        $stmt->execute(['name' => $name, 'path' => $path]);

        $id = (int) Db::connection()->lastInsertId();

        return $this->find($id) ?? ['id' => $id, 'name' => $name, 'path' => $path, 'created_at' => ''];
    }

    public function delete(int $id): bool
    {
        $stmt = Db::connection()->prepare('DELETE FROM projects WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    /**
     * @param array<string, mixed> $row
     * @return array{id: int, name: string, path: string, created_at: string}
     */
    private function normalize(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => (string) $row['name'],
            'path' => (string) $row['path'],
            'created_at' => (string) $row['created_at'],
        ];
    }
}
