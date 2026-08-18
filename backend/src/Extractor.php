<?php

declare(strict_types=1);

namespace Visualizer;

use FilesystemIterator;
use Generator;
use PhpParser\Error;
use PhpParser\NodeTraverser;
use PhpParser\NodeVisitor\NameResolver;
use PhpParser\Parser;
use PhpParser\ParserFactory;
use RecursiveCallbackFilterIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use Visualizer\Visitors\CallGraphVisitor;

/**
 * Phase 1: walks a directory of PHP files and builds the raw nodes/edges
 * payload (no static-analysis warnings yet — see Phase 2).
 */
final class Extractor
{
    /** @var string[] directory names never descended into */
    private const SKIP_DIRS = ['vendor', 'node_modules', '.git'];

    private readonly string $rootPath;

    private readonly Parser $parser;

    public function __construct(string $rootPath)
    {
        $this->rootPath = rtrim($rootPath, '/\\');
        $this->parser = (new ParserFactory())->createForNewestSupportedVersion();
    }

    /**
     * @return array{nodes: list<array<string, mixed>>, edges: list<array<string, mixed>>}
     */
    public function extract(): array
    {
        $nodes = [];
        $edges = [];

        foreach ($this->phpFiles() as $file) {
            $relativePath = $this->relativePath($file);
            $code = file_get_contents($file);

            if ($code === false) {
                continue;
            }

            try {
                $ast = $this->parser->parse($code);
            } catch (Error $e) {
                $node = $this->failedNode($relativePath, $e);
                $nodes[$node['id']] = $node;

                continue;
            }

            if ($ast === null) {
                continue;
            }

            $visitor = new CallGraphVisitor($relativePath);
            $traverser = new NodeTraverser();
            $traverser->addVisitor(new NameResolver());
            $traverser->addVisitor($visitor);

            try {
                $traverser->traverse($ast);
            } catch (Error $e) {
                $node = $this->failedNode($relativePath, $e);
                $nodes[$node['id']] = $node;

                continue;
            }

            foreach ($visitor->getNodes() as $id => $node) {
                $nodes[$id] = $node;
            }

            foreach ($visitor->getEdges() as $id => $edge) {
                $edges[$id] = $edge;
            }
        }

        return [
            'nodes' => array_values($nodes),
            'edges' => array_values($edges),
        ];
    }

    /** @return array<string, mixed> */
    private function failedNode(string $relativePath, Error $e): array
    {
        $startLine = $e->getStartLine();

        return [
            'id' => 'ParseError::' . $relativePath,
            'type' => 'codeNode',
            'data' => [
                'label' => basename($relativePath),
                'file_path' => $relativePath,
                'start_line' => $startLine > 0 ? $startLine : null,
                'end_line' => null,
                'syntax_error' => $e->getMessage(),
                'warnings' => [],
            ],
        ];
    }

    private function relativePath(string $absolutePath): string
    {
        $relative = substr($absolutePath, strlen($this->rootPath));
        $relative = ltrim($relative, '/\\');

        return str_replace('\\', '/', $relative);
    }

    /** @return Generator<string> */
    private function phpFiles(): Generator
    {
        $directory = new RecursiveDirectoryIterator($this->rootPath, FilesystemIterator::SKIP_DOTS);

        $filter = new RecursiveCallbackFilterIterator(
            $directory,
            static function (SplFileInfo $current) {
                if ($current->isDir()) {
                    return !in_array($current->getFilename(), self::SKIP_DIRS, true);
                }

                return strtolower($current->getExtension()) === 'php';
            }
        );

        $iterator = new RecursiveIteratorIterator($filter);

        foreach ($iterator as $fileInfo) {
            /** @var SplFileInfo $fileInfo */
            if ($fileInfo->isFile()) {
                yield $fileInfo->getPathname();
            }
        }
    }
}
