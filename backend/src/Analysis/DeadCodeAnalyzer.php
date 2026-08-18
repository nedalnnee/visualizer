<?php

declare(strict_types=1);

namespace Visualizer\Analysis;

/**
 * Phase 2 dead-code pass.
 *
 * The spec named PHPStan / shipmonk/dead-code-detector for this. Those need
 * the target project's own working autoloader (a real `composer install`)
 * to run at all, which we can't assume — this tool has to work against an
 * arbitrary directory of PHP files, including our own fixture. So instead
 * this flags a method as dead using only the graph Phase 1 already built:
 * a node with no incoming edges is "possibly unused".
 *
 * This is intentionally conservative in wording, not in output — see the
 * false-positive classes documented on FLAG below and in docs/STATUS.md.
 * Because Phase 1 only resolves `$this->method()` and static calls (see
 * CallGraphVisitor), this pass inherits the same blind spots: a method
 * called only through an interface, DI container, event listener, route
 * closure, or reflection will show up as a false positive here.
 */
final class DeadCodeAnalyzer
{
    private const FLAG = 'Possibly unused: no incoming calls found in the extracted graph '
        . '(may be called via routing, DI, an interface, or reflection — verify before removing)';

    /**
     * Methods PHP itself calls implicitly; never flag these regardless of
     * incoming edges.
     */
    private const MAGIC_METHODS = [
        '__construct', '__destruct', '__call', '__callStatic', '__get', '__set',
        '__isset', '__unset', '__sleep', '__wakeup', '__serialize', '__unserialize',
        '__set_state', '__clone', '__invoke', '__toString', '__debugInfo',
    ];

    /**
     * @param array{nodes: list<array<string, mixed>>, edges: list<array<string, mixed>>} $graph
     * @return array{nodes: list<array<string, mixed>>, edges: list<array<string, mixed>>}
     */
    public function analyze(array $graph): array
    {
        $calledTargets = [];
        foreach ($graph['edges'] as $edge) {
            $calledTargets[$edge['target']] = true;
        }

        foreach ($graph['nodes'] as &$node) {
            if ($node['data']['syntax_error'] !== null) {
                // A node that failed to parse has no reliable call info.
                continue;
            }

            if (isset($calledTargets[$node['id']]) || $this->isMagicMethod($node['id'])) {
                continue;
            }

            $node['data']['warnings'][] = self::FLAG;
        }
        unset($node);

        return $graph;
    }

    private function isMagicMethod(string $nodeId): bool
    {
        $method = substr($nodeId, strrpos($nodeId, '::') + 2);

        return in_array($method, self::MAGIC_METHODS, true);
    }
}
