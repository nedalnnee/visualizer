<?php

declare(strict_types=1);

namespace Visualizer\Visitors;

use PhpParser\Node;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Expr\StaticCall;
use PhpParser\Node\Expr\Variable;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Stmt\Class_;
use PhpParser\Node\Stmt\ClassLike;
use PhpParser\Node\Stmt\ClassMethod;
use PhpParser\NodeVisitorAbstract;

/**
 * Walks a single file's AST and collects codeNode/edge entries for the
 * classes, methods, and method calls it finds. One instance per file.
 */
final class CallGraphVisitor extends NodeVisitorAbstract
{
    /** @var array<string, array<string, mixed>> */
    private array $nodes = [];

    /** @var array<string, array<string, mixed>> */
    private array $edges = [];

    /** @var array<int, array{name: string, extends: ?string}> */
    private array $classStack = [];

    /** @var string[] */
    private array $methodStack = [];

    public function __construct(private readonly string $filePath)
    {
    }

    public function enterNode(Node $node): null
    {
        if ($node instanceof ClassLike) {
            $this->classStack[] = [
                'name' => $this->resolveClassName($node),
                'extends' => $node instanceof Class_ && $node->extends !== null
                    ? $this->resolveReferencedName($node->extends)
                    : null,
            ];

            return null;
        }

        if ($node instanceof ClassMethod) {
            $this->enterMethod($node);

            return null;
        }

        if ($node instanceof MethodCall) {
            $this->recordMethodCall($node);

            return null;
        }

        if ($node instanceof StaticCall) {
            $this->recordStaticCall($node);

            return null;
        }

        return null;
    }

    public function leaveNode(Node $node): null
    {
        if ($node instanceof ClassLike) {
            array_pop($this->classStack);

            return null;
        }

        // Mirrors the push condition in enterMethod() — class context hasn't
        // been popped yet at this point, so the same check is valid here.
        if ($node instanceof ClassMethod && $this->currentClass() !== null) {
            array_pop($this->methodStack);

            return null;
        }

        return null;
    }

    /** @return array<string, array<string, mixed>> */
    public function getNodes(): array
    {
        return $this->nodes;
    }

    /** @return array<string, array<string, mixed>> */
    public function getEdges(): array
    {
        return $this->edges;
    }

    private function enterMethod(ClassMethod $node): void
    {
        $class = $this->currentClass();
        if ($class === null) {
            return;
        }

        $methodId = $class . '::' . $node->name->toString();
        $this->methodStack[] = $methodId;

        $this->nodes[$methodId] = [
            'id' => $methodId,
            'type' => 'codeNode',
            'data' => [
                'label' => $node->name->toString() . '()',
                'file_path' => $this->filePath,
                'start_line' => $node->getStartLine(),
                'end_line' => $node->getEndLine(),
                'syntax_error' => null,
                'warnings' => [],
            ],
        ];
    }

    private function recordMethodCall(MethodCall $node): void
    {
        $source = $this->currentMethod();
        $class = $this->currentClass();

        if ($source === null || $class === null || !$node->name instanceof Identifier) {
            return;
        }

        // Only $this->method() is resolvable without type inference; calls on
        // other variables/expressions can't be attributed to a class here.
        if (!$node->var instanceof Variable || $node->var->name !== 'this') {
            return;
        }

        $this->addEdge($source, $class . '::' . $node->name->toString());
    }

    private function recordStaticCall(StaticCall $node): void
    {
        $source = $this->currentMethod();
        if ($source === null || !$node->name instanceof Identifier) {
            return;
        }

        $className = $this->resolveStaticClassName($node->class);
        if ($className === null) {
            return;
        }

        $this->addEdge($source, $className . '::' . $node->name->toString());
    }

    private function resolveStaticClassName(Node $classNode): ?string
    {
        if (!$classNode instanceof Name) {
            // Dynamic class expression (e.g. `$class::method()`) — not
            // resolvable without type inference, skip it.
            return null;
        }

        return match (strtolower($classNode->toString())) {
            'self', 'static' => $this->currentClass(),
            'parent' => $this->currentExtends(),
            default => $this->resolveReferencedName($classNode),
        };
    }

    /**
     * Resolves a reference (extends, static-call class name, ...) to its
     * best-known fully-qualified form. NameResolver fully rewrites the Name
     * in place when it can (imported/already-qualified names); when it can't
     * (unqualified name in the current namespace, resolvable only at
     * runtime via autoloading) it leaves the short name but attaches a
     * best-effort 'namespacedName' attribute instead.
     */
    private function resolveReferencedName(Name $name): string
    {
        $namespaced = $name->getAttribute('namespacedName');

        return $namespaced instanceof Name ? $namespaced->toString() : $name->toString();
    }

    private function resolveClassName(ClassLike $node): string
    {
        // NameResolver sets this as a dynamic property (not a node
        // attribute) on the declaration node when the class is named.
        $resolved = $node->namespacedName ?? null;
        if ($resolved instanceof Name) {
            return $resolved->toString();
        }

        return $node->name !== null
            ? $node->name->toString()
            : 'anonymous@' . $node->getStartLine();
    }

    private function addEdge(string $source, string $target): void
    {
        $id = 'e_' . $source . '__' . $target;

        $this->edges[$id] = [
            'id' => $id,
            'source' => $source,
            'target' => $target,
            'animated' => true,
        ];
    }

    private function currentClass(): ?string
    {
        $top = end($this->classStack);

        return $top === false ? null : $top['name'];
    }

    private function currentExtends(): ?string
    {
        $top = end($this->classStack);

        return $top === false ? null : $top['extends'];
    }

    private function currentMethod(): ?string
    {
        $top = end($this->methodStack);

        return $top === false ? null : $top;
    }
}
