import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { SvgWarning, SvgZap, SvgCycle, SvgCode } from './Icons';
import type { CodeNodeData } from '../types/graph';

export function CodeNode({ data, selected }: NodeProps<Node<CodeNodeData>>) {
  const hasError = data.syntax_error !== null;
  const hasWarnings = data.warnings && data.warnings.length > 0;
  const isHighlighted = Boolean(data.highlighted);
  const isDimmed = Boolean(data.dimmed);
  const isInCycle = Boolean(data.isInCycle);
  const isInPath = Boolean(data.isInPath);
  const isClass = !data.label.includes('::');

  let stateClasses = 'border-slate-300 bg-white text-slate-800 hover:border-slate-400';
  if (hasError) {
    stateClasses = 'border-rose-500 bg-rose-50/95 text-rose-950 ring-1 ring-rose-300';
  } else if (isInCycle) {
    stateClasses = 'border-orange-500 bg-orange-50/90 text-orange-950 ring-2 ring-orange-400/80 animate-pulse';
  } else if (isInPath) {
    stateClasses = 'border-cyan-500 bg-cyan-50/95 text-cyan-950 ring-2 ring-cyan-400 font-bold';
  } else if (hasWarnings) {
    stateClasses = 'border-amber-400 border-dashed bg-amber-50/80 text-amber-950';
  } else if (isClass) {
    stateClasses = 'border-indigo-400 bg-indigo-50/80 text-indigo-950 font-semibold shadow-indigo-100';
  }

  return (
    <div
      className={`group relative min-w-[190px] max-w-[300px] rounded-xl border-2 px-3 py-2 text-xs shadow-sm transition-all duration-150 ${stateClasses} ${
        selected || isHighlighted
          ? 'ring-2 ring-blue-500 shadow-lg scale-[1.03] z-30'
          : ''
      } ${isDimmed ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100'}`}
    >
      {/* Dynamic Direction Connection Handles */}
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />

      {/* Header Tag Bar */}
      <div className="mb-1.5 flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.5 rounded font-medium ${
            isClass ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
          }`}>
            {isClass ? 'Class' : 'Method'}
          </span>

          {isInCycle && (
            <span className="flex items-center gap-0.5 rounded bg-orange-100 px-1 py-0.5 font-bold text-orange-700">
              <SvgCycle className="h-2.5 w-2.5" />
              <span>Cycle</span>
            </span>
          )}

          {isInPath && (
            <span className="rounded bg-cyan-100 px-1 py-0.5 font-bold text-cyan-800">
              Path
            </span>
          )}
        </div>

        {data.start_line !== null && (
          <span className="flex items-center gap-0.5 text-slate-400 font-mono text-[9px]">
            <SvgCode className="h-2.5 w-2.5" />
            <span>L{data.start_line}</span>
          </span>
        )}
      </div>

      {/* Node Label Title */}
      <div className="flex items-center gap-1.5 font-medium">
        {hasError && <SvgWarning className="shrink-0 text-rose-600 h-3.5 w-3.5" />}
        <span className="truncate font-mono text-xs font-bold" title={data.label}>
          {data.label}
        </span>
      </div>

      {/* Warning details */}
      {hasWarnings && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 font-medium truncate">
          <SvgZap className="h-3 w-3 shrink-0 text-amber-500" />
          <span className="truncate">{data.warnings[0]}</span>
        </div>
      )}

      {/* Syntax Error callout */}
      {hasError && (
        <div className="mt-1 truncate text-[10px] font-mono text-rose-700 font-medium bg-rose-100/80 px-1.5 py-0.5 rounded">
          {data.syntax_error}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-slate-400 border-2 border-white" />
    </div>
  );
}
