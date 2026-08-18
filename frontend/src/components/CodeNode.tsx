import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import type { CodeNodeData } from '../types/graph';

export function CodeNode({ data, selected }: NodeProps<Node<CodeNodeData>>) {
  const hasError = data.syntax_error !== null;
  const hasWarnings = data.warnings.length > 0;
  const isHighlighted = Boolean((data as Record<string, unknown>).highlighted);
  const isDimmed = Boolean((data as Record<string, unknown>).dimmed);
  const isClass = !data.label.includes('::');

  let stateClasses = 'border-slate-300 bg-white text-slate-800 hover:border-slate-400';
  if (hasError) {
    stateClasses = 'border-rose-500 bg-rose-50/90 text-rose-950 ring-1 ring-rose-300';
  } else if (hasWarnings) {
    stateClasses = 'border-amber-400 border-dashed bg-amber-50/70 text-amber-950';
  } else if (isClass) {
    stateClasses = 'border-indigo-400 bg-indigo-50/60 text-indigo-950 font-semibold';
  }

  return (
    <div
      className={`group relative min-w-[180px] max-w-[280px] rounded-lg border-2 px-3 py-2 text-xs shadow-sm transition-all duration-150 ${stateClasses} ${
        selected || isHighlighted
          ? 'ring-2 ring-blue-500 shadow-md scale-[1.02] z-20'
          : ''
      } ${isDimmed ? 'opacity-25 grayscale' : 'opacity-100'}`}
    >
      {/* Handles for TB & LR layout compatibility */}
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />

      {/* Header pill / Type marker */}
      <div className="mb-1 flex items-center justify-between gap-1 text-[10px] text-slate-400 font-mono">
        <span className={`px-1.5 py-0.2 rounded font-medium ${
          isClass ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {isClass ? 'Class' : 'Method'}
        </span>
        {data.start_line !== null && (
          <span className="text-slate-400 font-mono">L{data.start_line}</span>
        )}
      </div>

      {/* Main Node Label */}
      <div className="flex items-center gap-1.5 font-medium">
        {hasError && <ExclamationTriangleIcon className="shrink-0 text-rose-600 h-3.5 w-3.5" />}
        <span className="truncate font-mono text-xs" title={data.label}>
          {data.label}
        </span>
      </div>

      {/* Warning pills */}
      {hasWarnings && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium">
          <span>⚡</span>
          <span className="truncate">{data.warnings[0]}</span>
        </div>
      )}

      {/* Error detail snippet */}
      {hasError && (
        <div className="mt-1 truncate text-[10px] font-mono text-rose-700 font-medium bg-rose-100/70 px-1 py-0.5 rounded">
          {data.syntax_error}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
    </div>
  );
}
