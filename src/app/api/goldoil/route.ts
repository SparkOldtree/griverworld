// GET /api/goldoil — 黄金/原油核心指标近 3 年日度数据
// 数据源：data/goldoil.db（由 scripts/fetch-goldoil.mjs 采集，服务器每日任务执行）
//         data/gold-etf-holdings.json（全球黄金 ETF 持仓，WGC 数据手动维护）

import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getGoldOilSeriesAll,
  getGoldOilLatestAll,
  getGoldOilDbInitError,
} from '@/lib/goldoil/db';
import { GOLDOIL_META } from '@/lib/goldoil/meta';
import type {
  GoldOilResponse,
  GoldOilItemDto,
  GoldEtfDto,
} from '@/lib/goldoil/types';

export const dynamic = 'force-dynamic';

const ETF_FALLBACK: GoldEtfDto = {
  tonnes: null,
  asOf: null,
  source: 'WGC Goldhub（世界黄金协会，全球黄金 ETF 持仓，周度发布）',
  note: '手动维护数据，待首次录入',
};

function loadEtfHoldings(): GoldEtfDto {
  try {
    const path = join(process.cwd(), 'data/gold-etf-holdings.json');
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    return {
      tonnes: typeof raw.tonnes === 'number' ? raw.tonnes : null,
      asOf: typeof raw.asOf === 'string' ? raw.asOf : null,
      source: typeof raw.source === 'string' && raw.source ? raw.source : ETF_FALLBACK.source,
      note: typeof raw.note === 'string' && raw.note ? raw.note : ETF_FALLBACK.note,
    };
  } catch {
    return ETF_FALLBACK;
  }
}

export async function GET() {
  const dbError = getGoldOilDbInitError();

  const seriesRows = getGoldOilSeriesAll();
  const latestRows = getGoldOilLatestAll();

  const byCodeSeries = new Map<string, { date: string; close: number | null }[]>();
  for (const r of seriesRows) {
    const arr = byCodeSeries.get(r.code) ?? [];
    arr.push({ date: r.trade_date, close: r.close });
    byCodeSeries.set(r.code, arr);
  }
  const latestByCode = new Map(latestRows.map((r) => [r.code, r]));

  const items: GoldOilItemDto[] = GOLDOIL_META.map((m) => {
    const latest = latestByCode.get(m.code);
    const series = byCodeSeries.get(m.code) ?? [];
    return {
      code: m.code,
      name: m.name,
      group: m.group,
      unit: m.unit,
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

  const gold = items.filter((i) => i.group === 'gold');
  const oil = items.filter((i) => i.group === 'oil');
  const etf = loadEtfHoldings();

  const updatedAt = latestRows.reduce<string | null>(
    (acc, r) => (r.updated_at && (!acc || r.updated_at > acc) ? r.updated_at : acc),
    null,
  );

  const res: GoldOilResponse = { gold, oil, etf, updatedAt, dbError };
  return NextResponse.json(res, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  });
}
