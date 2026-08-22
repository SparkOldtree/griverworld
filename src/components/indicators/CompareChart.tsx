'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';
import type { ThemeSeriesDto } from '@/lib/indicators/types';
import { THEME_ANALYSIS } from '@/lib/indicators/analysis';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

/** 中国指标线：红色系；美国指标线：蓝色系 */
const CN_COLORS = ['#dc2626', '#f87171', '#b91c1c'];
const US_COLORS = ['#2563eb', '#60a5fa', '#1d4ed8'];

interface Props {
  theme: string;
  themeName: string;
}

interface SeriesItem {
  code: string;
  /** 完整指标名（图例 + 说明卡片用） */
  name: string;
  region: 'CN' | 'US';
  regionName: string;
  unit: string;
  neutral: number;
  status: string;
  agency: string;
  frequency: string;
  definition: string;
  note: string;
  /** [日期, 数值]；数值为 null 表示数据缺失（如已置空的异常期） */
  data: [string, number | null][];
}

/** 图例截断，避免过长换行；悬停仍显示完整名 */
function legendFormatter(name: string): string {
  return name.length > 13 ? `${name.slice(0, 13)}…` : name;
}

interface RegionChartProps {
  series: SeriesItem[];
  colors: string[];
  emptyText: string;
}

/** 单个地区折线图 + 指标含义与口径说明 */
function RegionChart({ series, colors, emptyText }: RegionChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const hasData = series.some((s) => s.data.some(([, v]) => v !== null));

  useEffect(() => {
    if (!ref.current || !hasData) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current);
    }
    const chart = chartRef.current;

    // x 轴 = 所有序列日期的并集（含数据缺失的日期，保持时间轴完整）
    const dateSet = new Set<string>();
    series.forEach((s) => s.data.forEach(([d]) => dateSet.add(d)));
    const dates = [...dateSet].sort();

    const option: EChartsCoreOption = {
      animationDuration: 400,
      color: colors,
      legend: {
        top: 0,
        textStyle: { color: '#71717a', fontSize: 12 },
        formatter: legendFormatter,
        tooltip: { show: true },
      },
      grid: { top: 36, left: 10, right: 20, bottom: 40, containLabel: true },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(24,24,27,0.95)',
        borderWidth: 0,
        textStyle: { color: '#e4e4e7', fontSize: 12 },
      },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', height: 14, bottom: 4, borderColor: 'transparent', backgroundColor: '#f4f4f5' },
      ],
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#71717a', fontSize: 11 },
        axisLine: { lineStyle: { color: '#e4e4e7' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        // 纵坐标刻度处的网格线：虚线
        splitLine: { lineStyle: { color: '#e4e4e7', type: 'dashed', width: 1 } },
        axisLabel: { color: '#71717a', fontSize: 11 },
      },
      series: series.map((s, i) => ({
        name: s.name,
        type: 'line' as const,
        connectNulls: false,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2 },
        itemStyle: { color: colors[i % colors.length] },
        data: dates.map((d) => {
          const hit = s.data.find(([dd]) => dd === d);
          return hit ? hit[1] : null;
        }),
        markLine:
          s.status === 'active'
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#a1a1aa', type: 'dashed', width: 1 },
                label: { formatter: `中性 ${s.neutral}`, color: '#a1a1aa', fontSize: 10, position: 'insideEndTop' },
                data: [{ yAxis: s.neutral }],
              }
            : undefined,
      })),
    };

    chart.setOption(option, true);

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [series, hasData, colors]);

  if (!hasData) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-zinc-200 text-sm text-zinc-400 dark:border-zinc-800">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      <div ref={ref} className="h-[280px] w-full" />

      {/* 该地区指标的含义与口径说明 */}
      <div className="mt-3 space-y-3">
        {series.map((s) => (
          <div
            key={s.code}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {s.regionName} · {s.name}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {s.agency} · {s.frequency}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {s.definition}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">口径说明：</span>
              {s.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompareChart({ theme, themeName }: Props) {
  const [data, setData] = useState<ThemeSeriesDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/indicators?theme=${encodeURIComponent(theme)}`)
      .then((r) => r.json())
      .then((json: ThemeSeriesDto) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  const seriesList = useMemo<SeriesItem[]>(() => {
    if (!data) return [];
    return Object.entries(data.series).map(([code, rows]) => {
      const meta = data.meta[code];
      return {
        code,
        name: meta.name,
        region: meta.region,
        regionName: meta.regionName,
        unit: meta.unit,
        neutral: meta.neutral,
        status: meta.status,
        agency: meta.agency,
        frequency: meta.frequency,
        definition: meta.definition,
        note: meta.note,
        data: rows.map((r) => [r.report_date, r.value]),
      };
    });
  }, [data]);

  const cnSeries = useMemo(() => seriesList.filter((s) => s.region === 'CN'), [seriesList]);
  const usSeries = useMemo(() => seriesList.filter((s) => s.region === 'US'), [seriesList]);
  const analysis = THEME_ANALYSIS[theme] ?? [];

  if (loading) {
    return <div className="flex h-[320px] items-center justify-center text-sm text-zinc-400">加载中...</div>;
  }

  return (
    <div>
      {/* 中国（上） */}
      <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">中国 · {themeName}</h3>
      <RegionChart series={cnSeries} colors={CN_COLORS} emptyText="中国暂未收录该主题指标（数据源待接入）" />

      {/* 美国（下） */}
      <h3 className="mb-2 mt-6 text-sm font-semibold text-zinc-700 dark:text-zinc-300">美国 · {themeName}</h3>
      <RegionChart series={usSeries} colors={US_COLORS} emptyText="美国暂未收录该主题指标（数据源待接入）" />

      {/* 分析说明 */}
      {analysis.length > 0 && (
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">分析说明</h4>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            以下为相关指标之间的常见关系，供理解走势与相互印证时参考。
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.map((p, i) => (
              <li key={i} className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                · {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
        虚线为坐标网格线与中性参考线（如 PMI 荣枯线 50 / 同比 0）；断点表示该期数据缺失或已置空。中美指标口径存在差异，对比时以各自趋势为准。
      </p>
    </div>
  );
}
