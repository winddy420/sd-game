'use client';

import type { ScenarioTarget } from '@sd-game/content';
import type { ArchitectureResult } from '@sd-game/game-engine';
import { describeAvailability } from '@sd-game/game-engine';
import { Card } from '@/components/ui/primitives';
import { cn, formatNumber, formatMoney } from '@/lib/utils';
import { Gauge, DollarSign, ShieldCheck, Activity } from 'lucide-react';

export function MetricsPanel({
  result,
  target,
}: {
  result: ArchitectureResult | null;
  target: ScenarioTarget;
}) {
  if (!result) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-400">
          Build a topology, then run the simulation to see your metrics vs. the targets.
        </p>
        <div className="mt-3 space-y-1 text-xs text-gray-400">
          {target.minRps && <div>· Handle ≥ {formatNumber(target.minRps)} rps</div>}
          {target.maxLatencyP95 && <div>· p95 latency ≤ {target.maxLatencyP95} ms</div>}
          {target.maxCostPerMonth && <div>· Cost ≤ {formatMoney(target.maxCostPerMonth)}/mo</div>}
          {target.minAvailability && (
            <div>· Availability ≥ {(target.minAvailability * 100).toFixed(2)}%</div>
          )}
        </div>
      </Card>
    );
  }

  const m = result.metrics;
  const c = result.targetChecks;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Throughput"
          value={`${formatNumber(m.maxThroughput)} rps`}
          ok={c.throughput}
          target={target.minRps ? `≥ ${formatNumber(target.minRps)}` : undefined}
        />
        <MetricTile
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="p95 Latency"
          value={`${m.latencyP95} ms`}
          ok={c.latency}
          target={target.maxLatencyP95 ? `≤ ${target.maxLatencyP95} ms` : undefined}
        />
        <MetricTile
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Cost"
          value={`${formatMoney(m.costPerMonth)}/mo`}
          ok={c.cost}
          target={target.maxCostPerMonth ? `≤ ${formatMoney(target.maxCostPerMonth)}` : undefined}
        />
        <MetricTile
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Availability"
          value={describeAvailability(m.availability)}
          ok={c.availability}
          target={
            target.minAvailability ? `≥ ${(target.minAvailability * 100).toFixed(2)}%` : undefined
          }
        />
      </div>

      {/* Grade */}
      <Card className={cn('p-4', gradeColor(result.grade))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">SLO Grade</div>
            <div className="text-3xl font-bold">{result.grade}</div>
          </div>
          <div className="text-right text-xs">
            <div className={cn('font-semibold', result.metrics.connected ? 'text-emerald-400' : 'text-red-400')}>
              {result.metrics.connected ? '● Connected' : '○ Disconnected'}
            </div>
            {result.hasRequiredComponents ? (
              <div className="text-gray-400">All required components present</div>
            ) : (
              <div className="text-red-400">
                Missing: {result.missingTypes.join(', ')}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Feedback */}
      {result.feedback.length > 0 && (
        <Card className="p-4">
          <div className="space-y-1.5 text-sm">
            {result.feedback.map((f, i) => (
              <div key={i} className="text-gray-300">
                {f}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  ok,
  target,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
  target?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-2.5',
        ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5',
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      {target && <div className="text-[10px] text-gray-400">target {target}</div>}
    </div>
  );
}

function gradeColor(grade: string) {
  switch (grade) {
    case 'S':
      return 'border-emerald-500/50 bg-emerald-500/10';
    case 'A':
      return 'border-lime-500/40 bg-lime-500/5';
    case 'B':
      return 'border-amber-500/40 bg-amber-500/5';
    case 'C':
      return 'border-orange-500/40 bg-orange-500/5';
    default:
      return 'border-red-500/50 bg-red-500/5';
  }
}
