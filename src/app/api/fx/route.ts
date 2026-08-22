import { NextResponse } from 'next/server';
import { FX_META } from '@/lib/fx/meta';
import type { FxResponse, FxDto } from '@/lib/fx/types';
import {
  getFxDbInitError,
  getFxLatestAll,
  getFxSeries,
  getFxLastFetchAt,
} from '@/lib/fx/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbError = getFxDbInitError();
  if (dbError) {
    return NextResponse.json<FxResponse>({ items: [], updatedAt: null, dbError });
  }

  const latestMap = getFxLatestAll();
  const items: FxDto[] = FX_META.map((meta) => {
    const rows = getFxSeries(meta.code);
    const latest = latestMap[meta.code] ?? null;
    return {
      code: meta.code,
      currency: meta.currency,
      name: meta.name,
      pairLabel: meta.pairLabel,
      country: meta.country,
      decimals: meta.decimals,
      note: meta.note,
      latest: latest
        ? {
            avg: latest.avg,
            prevAvg: latest.prev_avg,
            changePct: latest.change_pct,
            month: latest.month,
          }
        : null,
      series: rows.map((r) => ({ month: r.month, avg: r.avg })),
    };
  });

  return NextResponse.json<FxResponse>({
    items,
    updatedAt: getFxLastFetchAt(),
    dbError: null,
  });
}
