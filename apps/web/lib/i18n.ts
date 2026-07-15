import { useTranslations } from 'next-intl';
import type { FeedbackItem } from '@sd-game/game-engine';
import { formatNumber } from './utils';

type TFunc = ReturnType<typeof useTranslations>;

/**
 * Turn an architecture feedback item (a stable key + raw numeric params from the
 * engine) into a localised display string. This is the single place that knows
 * how feedback params map onto message-catalog values, so the engine stays free
 * of display strings and grading stays locale-independent.
 */
export function formatFeedback(item: FeedbackItem, t: TFunc): string {
  const p = item.params;
  switch (item.key) {
    case 'missingType':
      return t('feedback.missingType', {
        type: t(`componentTypes.${String(p.type)}`),
      });
    case 'throughput':
      return t('feedback.throughput', {
        actual: formatNumber(Number(p.actual)),
        target: formatNumber(Number(p.target)),
      });
    case 'bottleneck':
      return t('feedback.bottleneck', { names: String(p.names) });
    case 'latency':
      return t('feedback.latency', { actual: Number(p.actual), budget: Number(p.budget) });
    case 'availability':
      return t('feedback.availability', { actual: Number(p.actual), target: Number(p.target) });
    case 'cost':
      return t('feedback.cost', {
        actual: formatNumber(Number(p.actual)),
        budget: formatNumber(Number(p.budget)),
      });
    default:
      return t(`feedback.${item.key}`);
  }
}

/** Localised label for a component TYPE id, e.g. 'loadBalancer' → 'Load Balancer'. */
export function useComponentTypeLabel() {
  const t = useTranslations('componentTypes');
  return (type: string) => t(type as never);
}
