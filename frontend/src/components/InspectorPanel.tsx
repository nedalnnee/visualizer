import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import type { GraphNode } from '../types/graph';

interface InspectorPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

// Phase 4: bound to GraphCanvas's onNodeClick. modal={false} + no overlay is
// deliberate — a modal overlay would swallow the click when jumping straight
// from one node to another, forcing close-then-click-again. Radix still
// gives us Escape-to-close and click-outside-to-close without it.
export function InspectorPanel({ node, onClose }: InspectorPanelProps) {
  return (
    <Dialog.Root open={node !== null} onOpenChange={(open) => !open && onClose()} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          className="fixed top-0 right-0 h-full w-[380px] overflow-y-auto border-l border-gray-200 bg-white p-5 shadow-xl focus:outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {node && (
            <>
              <div className="mb-4 flex items-start justify-between gap-2">
                <Dialog.Title className="font-mono text-base font-semibold break-all text-gray-900">
                  {node.data.label}
                </Dialog.Title>
                <Dialog.Close aria-label="Close" className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <Cross2Icon />
                </Dialog.Close>
              </div>
              <Dialog.Description className="sr-only">
                Details for the selected code node: file location, line numbers, and any warnings or errors.
              </Dialog.Description>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-400 uppercase">File</dt>
                  <dd className="font-mono break-all text-gray-800">{node.data.file_path}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-400 uppercase">Lines</dt>
                  <dd className="text-gray-800">
                    {node.data.start_line ?? '?'}
                    {node.data.end_line !== null ? `–${node.data.end_line}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-400 uppercase">ID</dt>
                  <dd className="font-mono text-xs break-all text-gray-500">{node.id}</dd>
                </div>
              </dl>

              {node.data.syntax_error !== null && (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-medium tracking-wide text-red-700 uppercase">Syntax error</p>
                  <p className="mt-1 text-sm text-red-800">{node.data.syntax_error}</p>
                </div>
              )}

              {node.data.warnings.length > 0 && (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium tracking-wide text-amber-700 uppercase">Warnings</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-amber-800">
                    {node.data.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
