import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { CodeNodeData } from '../types/graph';

// Phase 4: appearance is driven entirely by data.syntax_error / data.warnings
// — see the "Node visuals are data-driven" note in the root CLAUDE.md. Don't
// add new node types for new status flags; extend CodeNodeData instead.
export function CodeNode({ data, selected }: NodeProps<Node<CodeNodeData>>) {
  const hasError = data.syntax_error !== null;
  const hasWarnings = data.warnings.length > 0;

  const stateClasses = hasError
    ? 'border-red-500 bg-red-50 border-solid'
    : hasWarnings
      ? 'border-gray-400 border-dashed bg-gray-50 opacity-80'
      : 'border-gray-300 border-solid bg-white';

  return (
    <div
      className={`min-w-[160px] rounded-md border-2 px-3 py-2 shadow-sm ${stateClasses} ${
        selected ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
        {hasError && <ExclamationTriangleIcon className="shrink-0 text-red-600" />}
        <span className="truncate">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
