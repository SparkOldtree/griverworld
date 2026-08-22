/** 数值格式化（按单位保留精度） */
export function formatValue(v: number | null | undefined, unit = ''): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const abs = Math.abs(v);
  let s: string;
  if (abs >= 1000) s = v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  else if (abs >= 10) s = v.toFixed(1);
  else s = v.toFixed(2);
  return unit === '指数' ? s : `${s}${unit}`;
}

/** 变化读数（涨跌颜色与箭头） */
export function changeInfo(change: number | null, direction: 'up_good' | 'down_good' | 'neutral') {
  if (change === null || change === 0) return { text: '持平', cls: 'text-zinc-500', arrow: '' };
  const up = change > 0;
  const good = direction === 'neutral' ? null : up === (direction === 'up_good');
  const cls =
    good === null
      ? 'text-zinc-500'
      : good
        ? 'text-red-600 dark:text-red-400'
        : 'text-blue-600 dark:text-blue-400';
  const arrow = up ? '▲' : '▼';
  return { text: `${arrow} ${Math.abs(change).toFixed(2)}`, cls, arrow };
}
