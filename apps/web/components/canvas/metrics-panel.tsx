'use client';

import type { ScenarioTarget } from '@sd-game/content';
import type { ArchitectureResult } from '@sd-game/game-engine';
import { availabilityParts } from '@sd-game/game-engine';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/primitives';
import { cn, formatNumber, formatMoney } from '@/lib/utils';
import { formatFeedback } from '@/lib/i18n';
import { Gauge, DollarSign, ShieldCheck, Activity } from 'lucide-react';

export function MetricsPanel({
  result,
  target,
}: {
  result: ArchitectureResult | null;
  target: ScenarioTarget;
}) {
  const t = useTranslations('canvas');
  const tRoot = useTranslations();

  if (!result) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-400">{t('buildHint')}</p>
        <div className="mt-3 space-y-1 text-xs text-gray-400">
          {target.minRps && <div>{t('handleRps', { n: formatNumber(target.minRps) })}</div>}
          {target.maxLatencyP95 && <div>{t('latencyLe', { n: target.maxLatencyP95 })}</div>}
          {target.maxCostPerMonth && (
            <div>{t('costLe', { n: formatMoney(target.maxCostPerMonth) })}</div>
          )}
          {target.minAvailability && (
            <div>{t('availGe', { n: (target.minAvailability * 100).toFixed(2) })}</div>
          )}
        </div>
      </Card>
    );
  }

  const m = result.metrics;
  const c = result.targetChecks;
  const avail = availabilityParts(m.availability);
  const availValue =
    avail.nines >= 2
      ? t('availNines', { pct: avail.pct, nines: avail.nines })
      : `${avail.pct}%`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label={t('throughput')}
          value={t('rps', { n: formatNumber(m.maxThroughput) })}
          ok={c.throughput}
          target={target.minRps ? `≥ ${formatNumber(target.minRps)}` : undefined}
          targetWord={t('targetWord')}
        />
        <MetricTile
          icon={<Gauge className="h-3.5 w-3.5" />}
          label={t('latency')}
          value={t('ms', { n: m.latencyP95 })}
          ok={c.latency}
          target={target.maxLatencyP95 ? `≤ ${target.maxLatencyP95} ms` : undefined}
          targetWord={t('targetWord')}
        />
        <MetricTile
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label={t('cost')}
          value={`${formatMoney(m.costPerMonth)}/mo`}
          ok={c.cost}
          target={target.maxCostPerMonth ? `≤ ${formatMoney(target.maxCostPerMonth)}` : undefined}
          targetWord={t('targetWord')}
        />
        <MetricTile
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label={t('availability')}
          value={availValue}
          ok={c.availability}
          target={
            target.minAvailability ? `≥ ${(target.minAvailability * 100).toFixed(2)}%` : undefined
          }
          targetWord={t('targetWord')}
        />
      </div>

      {/* Grade */}
      <Card className={cn('p-4', gradeColor(result.grade))}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">{t('sloGrade')}</div>
            <div className="text-3xl font-bold">{result.grade}</div>
          </div>
          <div className="text-right text-xs">
            <div
              className={cn(
                'font-semibold',
                result.metrics.connected ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {result.metrics.connected ? t('connectedDot') : t('disconnectedDot')}
            </div>
            {result.hasRequiredComponents ? (
              <div className="text-gray-400">{t('allRequired')}</div>
            ) : (
              <div className="text-red-400">
                {t('missing', {
                  types: result.missingTypes
                    .map((tp) => tRoot(`componentTypes.${tp}` as 'cdn'))
                    .join(', '),
                })}
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
                {formatFeedback(f, tRoot)}
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
  targetWord,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ok: boolean;
  target?: string;
  targetWord: string;
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
      {target && (
        <div className="text-[10px] text-gray-400">
          {targetWord} {target}
        </div>
      )}
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
