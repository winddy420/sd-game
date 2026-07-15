'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  COMPONENT_BY_ID,
  localizedComponent,
  type ComponentDef,
  type Topology,
} from '@sd-game/content';
import { useTranslations } from 'next-intl';
import { ComponentNode } from './component-node';
import { Trash2, Plus, Minus, Zap, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { useLocale } from '@/lib/store/game-store';
import { cn } from '@/lib/utils';

const nodeTypes: NodeTypes = { component: ComponentNode };

let idCounter = 0;
const nextId = () => `n_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

export interface ArchitectureCanvasProps {
  allowedComponents: string[];
  /** Called whenever the topology changes (debounced upstream if needed). */
  onChange?: (topology: Topology) => void;
  initialTopology?: Topology | null;
}

function CanvasInner({ allowedComponents, onChange, initialTopology }: ArchitectureCanvasProps) {
  const t = useTranslations('canvas');
  const locale = useLocale();
  const { getNode } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Tap-to-connect mode (robust on touch + mouse): pick a source, then tap a target.
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);

  // Hydrate from a saved topology on mount.
  useEffect(() => {
    if (!initialTopology || initialTopology.nodes.length === 0) return;
    const restored: Node[] = initialTopology.nodes.map((n, i) => ({
      id: n.id,
      type: 'component',
      position: { x: 80 + (i % 4) * 220, y: 60 + Math.floor(i / 4) * 140 },
      data: { componentId: n.componentId, replicas: n.replicas },
    }));
    const restoredEdges: Edge[] = initialTopology.edges.map((e) => ({
      ...e,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
    }));
    setNodes(restored);
    setEdges(restoredEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emit topology on every change.
  useEffect(() => {
    const topology: Topology = {
      nodes: nodes.map((n) => ({
        id: n.id,
        componentId: (n.data as { componentId: string }).componentId,
        replicas: (n.data as { replicas: number }).replicas ?? 1,
      })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
    };
    onChange?.(topology);
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          { ...connection, id: nextId(), type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
          eds,
        ),
      );
    },
    [setEdges],
  );

  // Tap-to-connect: link the currently-selected source to a tapped target node.
  const linkNodes = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      setEdges((eds) => {
        // Avoid duplicate edges between the same pair/direction.
        if (eds.some((e) => e.source === sourceId && e.target === targetId)) return eds;
        return addEdge(
          {
            id: nextId(),
            source: sourceId,
            target: targetId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        );
      });
    },
    [setEdges],
  );

  const addComponent = useCallback(
    (def: ComponentDef) => {
      const id = nextId();
      // Spread nodes left→right, wrapping to a new row, so handles are easy to
      // reach and drag-to-connect doesn't fight overlapping cards.
      setNodes((nds) => {
        const count = nds.length;
        const position = {
          x: 40 + (count % 4) * 210,
          y: 30 + Math.floor(count / 4) * 150,
        };
        const node: Node = {
          id,
          type: 'component',
          position,
          data: { componentId: def.id, replicas: 1 },
          selected: true,
        };
        setSelectedId(id);
        return [...nds.map((n) => ({ ...n, selected: false })), node];
      });
    },
    [setNodes],
  );

  const updateReplicas = useCallback(
    (id: string, delta: number) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const data = n.data as { componentId: string; replicas: number };
          return { ...n, data: { ...data, replicas: Math.max(1, data.replicas + delta) } };
        }),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedId(null);
    },
    [setNodes, setEdges],
  );

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
  }, [setNodes, setEdges]);

  const palette = useMemo(
    () =>
      allowedComponents
        .map((id) => COMPONENT_BY_ID[id])
        .filter((d): d is ComponentDef => Boolean(d))
        .map((d) => localizedComponent(d, locale)),
    [allowedComponents, locale],
  );

  const selectedNode = selectedId ? getNode(selectedId) : null;
  const selectedRaw = selectedNode
    ? COMPONENT_BY_ID[(selectedNode.data as { componentId: string }).componentId]
    : undefined;
  const selectedDef = selectedRaw ? localizedComponent(selectedRaw, locale) : null;

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[180px_1fr]">
      {/* Palette */}
      <div className="order-2 min-w-0 lg:order-1">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t('components')}
        </div>
        <div className="flex gap-2 overflow-x-auto lg:grid lg:grid-cols-1">
          {palette.map((def) => (
            <button
              key={def.id}
              onClick={() => addComponent(def)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/5 bg-bg-card px-3 py-2 text-left text-sm transition-colors hover:border-accent/40 hover:bg-accent/5 lg:w-full"
              title={def.description}
            >
              <span className="text-lg">{def.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{def.name}</div>
                <div className="text-[10px] text-gray-400">${def.costPerMonth}/mo</div>
              </div>
            </button>
          ))}
        </div>
        {nodes.length > 0 && (
          <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={clearAll}>
            <Trash2 className="h-3.5 w-3.5" /> {t('clearCanvas')}
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-bg-soft">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => {
              if (linkSourceId) {
                // Complete tap-to-connect.
                linkNodes(linkSourceId, node.id);
                setLinkSourceId(null);
                setSelectedId(node.id);
              } else {
                setSelectedId(node.id);
              }
            }}
            onPaneClick={() => {
              setSelectedId(null);
              setLinkSourceId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a3a" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(10,10,15,0.7)"
              style={{ background: '#12121a' }}
            />
          </ReactFlow>

          {/* Link-mode banner (tap-to-connect) */}
          {linkSourceId && (
            <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-accent/40 bg-accent/15 px-4 py-1.5 text-xs font-medium text-accent-soft backdrop-blur">
              {t('tapTarget')} ·{' '}
              <button
                onClick={() => setLinkSourceId(null)}
                className="underline hover:text-white"
              >
                {t('cancel')}
              </button>
            </div>
          )}

          {/* Selected-node editor */}
          {selectedDef && selectedNode && (
            <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-bg-card/95 p-2 backdrop-blur">
              <span className="text-lg">{selectedDef.icon}</span>
              <span className="text-sm font-medium">{selectedDef.name}</span>
              <button
                onClick={() => {
                  setLinkSourceId(selectedNode.id);
                  setSelectedId(null);
                }}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                  linkSourceId === selectedNode.id
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-accent-soft hover:bg-white/10',
                )}
                title={t('connectHint')}
              >
                <Link2 className="h-3.5 w-3.5" /> {t('connect')}
              </button>
              <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
                <button
                  onClick={() => updateReplicas(selectedNode.id, -1)}
                  className="rounded p-1 hover:bg-white/10"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">
                  {(selectedNode.data as { replicas: number }).replicas}
                </span>
                <button
                  onClick={() => updateReplicas(selectedNode.id, 1)}
                  className="rounded p-1 hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Zap className="h-6 w-6" />
                <span className="text-sm">{t('emptyHint')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ArchitectureCanvas(props: ArchitectureCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className={cn()}>
        <CanvasInner {...props} />
      </div>
    </ReactFlowProvider>
  );
}
