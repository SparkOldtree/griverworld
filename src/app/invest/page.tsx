'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { IndexesResponse } from '@/lib/indexes/types';
import type { FxResponse } from '@/lib/fx/types';

const RANGE_OPTIONS = [
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: '3Y', label: '3Y', days: 1095 },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '--';
  return v.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '--';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function regionBadgeClass(region: string): string {
  const map: Record<string, string> = {
    中国: 'bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
    美国: 'bg-indigo-50 text-indigo-600 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900',
    日本: 'bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    英国: 'bg-sky-50 text-sky-600 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
    法国: 'bg-violet-50 text-violet-600 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
    德国: 'bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    韩国: 'bg-teal-50 text-teal-600 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900',
    中国香港: 'bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900',
    欧元区: 'bg-lime-50 text-lime-600 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:ring-lime-900',
  };
  return map[region] ?? 'bg-zinc-50 text-zinc-600 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-800';
}

/** 趋势折线图（纯 SVG，渐变面积 + 涨跌着色；指数日频 / 汇率月频通用） */
function TrendChart({
  points,
  decimals,
  latest,
  ariaLabel = '趋势',
}: {
  points: { date: string; value: number | null }[];
  decimals: number;
  latest: number | null;
  ariaLabel?: string;
}) {
  const rawId = useId();
  const gradId = `ig-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const w = 320;
  const h = 104;
  const padX = 6;
  const padY = 12;

  const valid = points.filter((p) => p.value != null && Number.isFinite(p.value)) as {
    date: string;
    value: number;
  }[];

  const geom = useMemo(() => {
    if (valid.length < 2) return null;
    const vals = valid.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    const span = max - min;
    if (span === 0) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    const x = (i: number) =>
      padX + (i / (valid.length - 1)) * (w - padX * 2);
    const y = (v: number) =>
      padY + (1 - (v - min) / range) * (h - padY * 2);

    let line = '';
    let area = '';
    valid.forEach((p, i) => {
      const px = x(i);
      const py = y(p.value);
      line += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
      area += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)}`;
    });
    area += `L${x(valid.length - 1).toFixed(2)},${h - padY}L${padX},${h - padY}Z`;
    return {
      line,
      area,
      min,
      max,
      first: valid[0],
      last: valid[valid.length - 1],
      lastY: y(valid[valid.length - 1].value),
      lastX: x(valid.length - 1),
    };
  }, [valid, w, h, padX, padY]);

  const up = latest != null && valid.length > 0 && latest >= valid[valid.length - 1].value;
  const stroke = up ? '#e11d48' : '#2563eb';
  const fill = up ? 'rgba(225,29,72,0.14)' : 'rgba(37,99,235,0.14)';

  if (!geom) {
    return (
      <div className="flex h-[104px] items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
        暂无趋势数据
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-[104px] w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={geom.area} fill={`url(#${gradId})`} />
      <path
        d={geom.line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={geom.lastX} cy={geom.lastY} r="2.6" fill={stroke} />
      <text
        x={geom.lastX - 4}
        y={geom.lastY - 8}
        textAnchor="end"
        className="fill-zinc-500 text-[9px] font-medium dark:fill-zinc-400"
      >
        {fmtNum(geom.last.value, decimals)}
      </text>
    </svg>
  );
}

export default function InvestPage() {
  const [range, setRange] = useState<RangeKey>('6M');
  const [indexData, setIndexData] = useState<IndexesResponse | null>(null);
  const [fxData, setFxData] = useState<FxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ir, fr] = await Promise.all([
        fetch('/api/indexes', { cache: 'no-store' }),
        fetch('/api/fx', { cache: 'no-store' }),
      ]);
      if (!ir.ok) throw new Error(`指数接口请求失败 HTTP ${ir.status}`);
      if (!fr.ok) throw new Error(`汇率接口请求失败 HTTP ${fr.status}`);
      const ij = (await ir.json()) as IndexesResponse;
      const fj = (await fr.json()) as FxResponse;
      if (ij.dbError) throw new Error(`指数数据库不可用：${ij.dbError}`);
      if (fj.dbError) throw new Error(`汇率数据库不可用：${fj.dbError}`);
      setIndexData(ij);
      setFxData(fj);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.key === range);
    return opt?.days ?? 180;
  }, [range]);

  /** 指数卡片：按各自最新交易日为基准做日频切片 */
  const indexCards = useMemo(() => {
    if (!indexData) return [];
    return indexData.indexes.map((idx) => {
      const s = idx.series;
      if (s.length === 0) return { ...idx, points: [] as { date: string; value: number | null }[] };
      const newest = s[s.length - 1].date;
      const cutoff = new Date(newest);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const points = s
        .filter((p) => p.date >= cutoffStr)
        .map((p) => ({ date: p.date, value: p.close }));
      return { ...idx, points };
    });
  }, [indexData, days]);

  /** 汇率卡片：以最新交易日为基准做日频切片，与指数共用同一时间窗口 */
  const fxCards = useMemo(() => {
    if (!fxData) return [];
    return fxData.items.map((it) => {
      const s = it.series;
      if (s.length === 0) return { ...it, points: [] as { date: string; value: number | null }[] };
      const newest = s[s.length - 1].date;
      const cutoff = new Date(newest);
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const points = s
        .filter((p) => p.date >= cutoffStr)
        .map((p) => ({ date: p.date, value: p.close }));
      return { ...it, points };
    });
  }, [fxData, days]);

  const updatedAt = useMemo(() => {
    if (!indexData?.updatedAt) return null;
    const d = new Date(indexData.updatedAt.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return indexData.updatedAt;
    return d.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [indexData]);

  const rangeNote = `${RANGE_OPTIONS.find((o) => o.key === range)?.label ?? '6M'} · 指数按交易日切片 / 汇率按交易日切片`;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          投资
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          全球核心股指走势与主要货币对美元汇率跟踪。指数数据来源：腾讯（A股指数）+ CNBC（海外指数），日频采集；
          汇率数据来源：ECB 参考汇率（Frankfurter），日频采集，时间窗口与指数对齐。
          {updatedAt && <span className="ml-2 text-zinc-400 dark:text-zinc-500">最近更新：{updatedAt}</span>}
        </p>
      </div>

      {/* 全局范围切换（两大部分共用） */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">时间范围</span>
        <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setRange(o.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === o.key
                  ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:text-zinc-100 dark:ring-zinc-600'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{rangeNote}</span>
      </div>

      {/* 第一部分：全球核心投资市场态势（指数） */}
      <section aria-labelledby="index-section-title">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2
            id="index-section-title"
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            全球核心投资市场态势
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            全球主要股指 · 近 3 年日度收盘
          </span>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              />
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              数据加载失败：{error}
            </p>
            <button
              onClick={load}
              className="mt-3 rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              重试
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {indexCards.map((idx) => {
              const latest = idx.latest?.close ?? null;
              const changePct = idx.latest?.changePct ?? null;
              const up =
                changePct != null ? changePct >= 0 : latest != null && idx.points.length > 0
                  ? latest >= (idx.points[idx.points.length - 1].value ?? latest)
                  : true;
              const tickColor = up ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400';
              const firstDate = idx.points[0]?.date;
              const lastDate = idx.points[idx.points.length - 1]?.date;

              return (
                <div
                  key={idx.code}
                  className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 transition-shadow hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {idx.name}
                        </h3>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${regionBadgeClass(idx.region)}`}
                        >
                          {idx.region}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {idx.exchange}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold tabular-nums ${tickColor}`}>
                        {fmtNum(latest, idx.decimals)}
                      </div>
                      <div className={`text-xs font-medium tabular-nums ${tickColor}`}>
                        {fmtPct(changePct)}
                      </div>
                    </div>
                  </div>

                  <TrendChart
                    points={idx.points}
                    decimals={idx.decimals}
                    latest={latest}
                    ariaLabel={`${idx.name}指数收盘价趋势`}
                  />

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                    <span>{firstDate ? `自 ${firstDate}` : '--'}</span>
                    <span className="font-medium tabular-nums">
                      {idx.points.length > 0 ? `${idx.points.length} 个交易日` : '暂无数据'}
                    </span>
                    <span>{lastDate ?? '--'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 第二部分：全球货币价值跟踪（汇率） */}
      <section aria-labelledby="fx-section-title" className="mt-12">
        <div className="mb-4">
          <h2
            id="fx-section-title"
            className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            全球货币价值跟踪
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            主要货币对美元汇率（ECB 参考汇率，统一为「1 美元 = X 本币」直接标价）。
            以每日收盘汇率作为数据点（当日 ECB 参考汇率），日度值与上方指数对齐，时间窗口保持一致。
            数值上行代表美元走强、本币相对走弱。
          </p>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              />
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fxCards.map((fx) => {
              const latest = fx.latest?.close ?? null;
              const changePct = fx.latest?.changePct ?? null;
              const up =
                changePct != null ? changePct >= 0 : latest != null && fx.points.length > 0
                  ? latest >= (fx.points[fx.points.length - 1].value ?? latest)
                  : true;
              const tickColor = up ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400';
              const firstDate = fx.points[0]?.date;
              const lastDate = fx.points[fx.points.length - 1]?.date;

              return (
                <div
                  key={fx.code}
                  className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 transition-shadow hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {fx.name}
                        </h3>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${regionBadgeClass(fx.country)}`}
                        >
                          {fx.country}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {fx.pairLabel} · 1 美元兑 {fx.currency}（日度值）
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold tabular-nums ${tickColor}`}>
                        {fmtNum(latest, fx.decimals)}
                      </div>
                      <div className={`text-xs font-medium tabular-nums ${tickColor}`}>
                        {fmtPct(changePct)}
                      </div>
                    </div>
                  </div>

                  <TrendChart
                    points={fx.points}
                    decimals={fx.decimals}
                    latest={latest}
                    ariaLabel={`${fx.name}对美元汇率日度趋势`}
                  />

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                    <span>{firstDate ? `自 ${firstDate}` : '--'}</span>
                    <span className="font-medium tabular-nums">
                      {fx.points.length > 0 ? `${fx.points.length} 个交易日` : '暂无数据'}
                    </span>
                    <span>{lastDate ?? '--'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
