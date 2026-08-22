'use client';

import type { IndicatorDto } from '@/lib/indicators/types';
import { changeInfo, formatValue } from './chart-utils';

interface Props {
  indicators: IndicatorDto[];
}

const CATEGORY_STYLE: Record<string, string> = {
  增长: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  价格: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  景气: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  就业: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  消费: 'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  投资: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  外贸: 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  货币: 'bg-lime-50 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  利率: 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

export default function IndicatorCards({ indicators }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {indicators.map((dto) => {
        const isPending = dto.status === 'pending';
        const info = changeInfo(dto.change, dto.direction);
        return (
          <div
            key={dto.code}
            className={`rounded-xl border p-4 ${
              isPending
                ? 'border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {dto.name}
                  </span>
                  {isPending ? (
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      数据源待接入
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        CATEGORY_STYLE[dto.category] ?? 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {dto.category}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  {dto.regionName} · {dto.frequency} · {dto.agency}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isPending ? 'text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {formatValue(dto.value, dto.unit)}
              </span>
              {!isPending && dto.value !== null && (
                <span className={`text-sm font-medium ${info.cls}`}>{info.text}</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
              {isPending
                ? '暂无数据，待接入数据源后自动显示'
                : `数据期 ${dto.reportDate ?? '—'}`}
              {dto.prev !== null && !isPending && ` · 上期 ${formatValue(dto.prev, dto.unit)}`}
              {dto.lag && !isPending && ` · ${dto.lag}`}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {dto.definition}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">口径说明：</span>
              {dto.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
