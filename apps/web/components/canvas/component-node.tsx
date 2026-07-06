'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { COMPONENT_BY_ID } from '@sd-game/content';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

export interface ComponentNodeData {
  componentId: string;
  replicas: number;
  [key: string]: unknown;
}

export function ComponentNode({ id, data, selected }: NodeProps) {
  const d = data as ComponentNodeData;
  const def = COMPONENT_BY_ID[d.componentId];
  if (!def) return null;

  return (
    <div
      className={cn(
        'w-40 rounded-xl border bg-bg-card px-3 py-2 shadow-lg transition-all',
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-white/10',
      )}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2">
        <span className="text-lg">{def.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{def.name}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500">{def.type}</div>
        </div>
        {d.replicas > 1 && (
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-soft">
            ×{d.replicas}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-gray-500">
        <span>{formatNumber(def.capacity)} rps</span>
        <span>${def.costPerMonth}/mo</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const nodeTypes = { component: ComponentNode };
