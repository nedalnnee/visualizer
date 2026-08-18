<?php

declare(strict_types=1);

namespace Visualizer;

use PDO;

/**
 * SQLite connection for the project registry (the dashboard's list of
 * projects). Not used for graph data — graphs are extracted on demand from
 * the filesystem each request, never persisted. See docs/STATUS.md Phase 5.
 */
final class Db
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $path = __DIR__ . '/../storage/visualizer.sqlite';

            if (!is_dir(dirname($path))) {
                mkdir(dirname($path), 0777, true);
            }

            $pdo = new PDO('sqlite:' . $path);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec(
                'CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    path TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )'
            );

            self::$connection = $pdo;
        }

        return self::$connection;
    }
}
