'use client';

import { useEffect, useState } from 'react';
import CompareChart from '@/components/indicators/CompareChart';
import IndicatorCards from '@/components/indicators/IndicatorCards';
import type { IndicatorsResponse, ThemeItem } from '@/lib/indicators/types';

export default function IndicatorsPage() {
  const [data, setData] = useState<IndicatorsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>('gdp');

  useEffect(() => {
    fetch('/api/indicators')
      .then((r) => r.json())
      .then((json: IndicatorsResponse) => {
        if ('error' in json) {
          setError((json as { error: string }).error);
          return;
        }
        setData(json);
        if (json.themes.length > 0 && !json.themes.some((t) => t.theme === activeTheme)) {
          setActiveTheme(json.themes[0].theme);
        }
      })
      .catch(() => setError('数据加载失败，请稍后重试'));
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
        <p className="text-sm text-red-600 dark:text-red-400">加载失败：{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16">
        <p className="text-sm text-zinc-500">加载中...</p>
      </div>
    );
  }

  const cnIndicators = data.indicators.filter((i) => i.region === 'CN');
  const usIndicators = data.indicators.filter((i) => i.region === 'US');
  const activeThemeItem: ThemeItem | undefined = data.themes.find(
    (t) => t.theme === activeTheme
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-xl font-bold">宏观指标</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          中国与美国主要宏观指标的月度快照与历史对比
          {data.updatedAt ? ` · 数据更新于 ${formatTime(data.updatedAt)}` : ''}
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          数据来源：东方财富数据中心公开接口（中国：国家统计局 / 央行 / 海关总署口径；美国：BEA / BLS / ISM / 美联储口径）；美国 10 年期国债收益率来自美联储 FRED。自动采集入库，每月更新；中国 10 年期国债收益率当前为人工维护月末值，行情接口恢复后自动更新。
        </p>
      </header>

      {/* 第一部分：中国宏观指标 */}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold">中国宏观指标</h2>
        <IndicatorCards indicators={cnIndicators} />
      </section>

      {/* 第二部分：美国宏观指标 */}
      <section className="mb-10">
        <h2 className="mb-3 text-base font-semibold">美国宏观指标</h2>
        <IndicatorCards indicators={usIndicators} />
      </section>

      {/* 第三部分：中美经济指标对比 */}
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">中美经济指标对比</h2>
          <select
            value={activeTheme}
            onChange={(e) => setActiveTheme(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {data.themes.map((t) => (
              <option key={t.theme} value={t.theme}>
                {t.themeName}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <CompareChart
            key={activeTheme}
            theme={activeTheme}
            themeName={activeThemeItem?.themeName ?? ''}
          />
        </div>
      </section>

      <footer className="text-xs text-zinc-400 dark:text-zinc-500">
        部分指标数据源待接入（社会融资规模、美国工业产出、美国初请失业金），接入后自动显示。本站数据仅供参考，不构成投资建议。
      </footer>
    </div>
  );
}

function formatTime(t: string): string {
  // SQLite datetime('now') → UTC；转为本地可读
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T') + 'Z');
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
