// GET /api/indexes — 全球主要股票指数近 3 年日度收盘
// 数据源：data/indexes.db（由 scripts/fetch-indexes.mjs 采集，服务器每日任务执行）

import { NextResponse } from 'next/server';
import {
  getIndexSeriesAll,
  getIndexLatestAll,
  getIndexDbInitError,
} from '@/lib/indexes/db';
import { INDEX_META } from '@/lib/indexes/meta';
import type { IndexesResponse, IndexDto } from '@/lib/indexes/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbError = getIndexDbInitError();

  const seriesRows = getIndexSeriesAll();
  const latestRows = getIndexLatestAll();

  const byCodeSeries = new Map<string, { date: string; close: number | null }[]>();
  for (const r of seriesRows) {
    const arr = byCodeSeries.get(r.code) ?? [];
    arr.push({ date: r.trade_date, close: r.close });
    byCodeSeries.set(r.code, arr);
  }
  const latestByCode = new Map(latestRows.map((r) => [r.code, r]));

  const indexes: IndexDto[] = INDEX_META.map((m) => {
    const latest = latestByCode.get(m.code);
    const series = byCodeSeries.get(m.code) ?? [];
    return {
      code: m.code,
      name: m.name,
      region: m.region,
      exchange: m.exchange,
      decimals: m.decimals,
      note: m.note,
      latest: latest
        ? {
            close: latest.close,
            prevClose: latest.prev_close,
            changePct: latest.change_pct,
            tradeDate: latest.trade_date,
          }
        : null,
      series,
    };
  });

  // 按最新 trade_date 排序（新数据在前的指数优先展示）
  indexes.sort((a, b) => {
    const da = a.latest?.tradeDate ?? '';
    const db_ = b.latest?.tradeDate ?? '';
    return da < db_ ? 1 : da > db_ ? -1 : 0;
  });

  // 全库最新更新时间（任意指数的最新 updated_at）
  const updatedAt = latestRows.reduce<string | null>(
    (acc, r) => (r.updated_at && (!acc || r.updated_at > acc) ? r.updated_at : acc),
    null,
  );

  const res: IndexesResponse = { indexes, updatedAt, dbError };
  return NextResponse.json(res, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  });
}
