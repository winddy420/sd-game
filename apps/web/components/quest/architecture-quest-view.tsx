'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ArchitectureQuest, Topology } from '@sd-game/content';
import type { ArchitectureResult } from '@sd-game/game-engine';
import { simulate } from '@sd-game/game-engine';
import { Card, Button } from '@/components/ui/primitives';
import { ArchitectureCanvas } from '@/components/canvas/architecture-canvas';
import { MetricsPanel } from '@/components/canvas/metrics-panel';
import { useGameStore } from '@/lib/store/game-store';
import { loadTopology } from '@/lib/db';
import { Play, Trophy, RotateCcw } from 'lucide-react';

export function ArchitectureQuestView({
  quest,
  onDone,
}: {
  quest: ArchitectureQuest;
  onDone: () => void;
}) {
  const [topology, setTopology] = useState<Topology>({ nodes: [], edges: [] });
  const [result, setResult] = useState<ArchitectureResult | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);

  const submitArchitecture = useGameStore((s) => s.submitArchitecture);
  const saveTopology = useGameStore((s) => s.saveTopology);

  // Load any saved canvas for this quest.
  useEffect(() => {
    let active = true;
    loadTopology(quest.id).then((t) => {
      if (active && t) setTopology(t);
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [quest.id]);

  const handleChange = useCallback(
    (t: Topology) => {
      setTopology(t);
      void saveTopology(quest.id, t);
    },
    [quest.id, saveTopology],
  );

  // Live preview metrics (not banking XP) as the player edits.
  const preview = (() => {
    if (!result && topology.nodes.length > 0) {
      return simulate(topology, quest.traffic);
    }
    return null;
  })();

  async function runSimulation() {
    setBusy(true);
    const r = await submitArchitecture(quest, topology);
    setResult(r);
    setBusy(false);
  }

  const passed = result?.passed;

  return (
    <div className="space-y-4">
      {/* Brief */}
      <Card>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-soft">
          Design Brief
        </div>
        <p className="text-sm text-gray-200">{quest.brief}</p>
        {quest.requiredComponentTypes && quest.requiredComponentTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-500">Required:</span>
            {quest.requiredComponentTypes.map((t) => (
              <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-gray-300">
                {t}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Canvas */}
      {hydrated && (
        <ArchitectureCanvas
          allowedComponents={quest.allowedComponents}
          initialTopology={topology}
          onChange={handleChange}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {topology.nodes.length} components · {topology.edges.length} connections
        </div>
        <Button size="lg" onClick={runSimulation} disabled={busy || topology.nodes.length === 0}>
          <Play className="h-4 w-4" />
          {busy ? 'Simulating…' : 'Run Simulation'}
        </Button>
      </div>

      {/* Metrics */}
      <MetricsPanel result={result} target={quest.target} />

      {/* Live preview hint while building */}
      {!result && preview && (
        <p className="text-center text-xs text-gray-500">
          Live preview: {preview.connected ? 'path connected' : '⚠ not connected yet'} · ~
          {preview.latencyP95}ms · {preview.costPerMonth}/mo
        </p>
      )}

      {/* Success state */}
      {passed && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold">Design approved! +{quest.xpReward} XP</h2>
                <p className="text-sm text-gray-400">Grade {result?.grade} — the CTO is impressed.</p>
              </div>
            </div>
            <Button onClick={onDone}>Continue</Button>
          </div>
        </Card>
      )}

      {/* Retry hint on failure */}
      {result && !passed && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" /> Revise design
          </Button>
        </div>
      )}
    </div>
  );
}
