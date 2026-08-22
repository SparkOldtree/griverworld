import { NextResponse } from 'next/server';
import { INDICATOR_META, groupByTheme } from '@/lib/indicators/meta';
import {
  getIndicatorsDbInitError,
  getLastFetchAt,
  getLatestAll,
  getSeries,
} from '@/lib/indicators/db';
import type { IndicatorDto, IndicatorsResponse, ThemeSeriesDto } from '@/lib/indicators/types';

/** 全部指标 + 最新读数（热力图与解读卡片数据源） */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get('theme');

  // 主题对比序列
  if (theme) {
    const members = INDICATOR_META.filter((m) => m.theme === theme);
    if (members.length === 0) {
      return NextResponse.json({ error: '未知主题' }, { status: 404 });
    }
    const seriesMap: Record<string, { report_date: string; value: number | null }[]> = {};
    for (const m of members) {
      seriesMap[m.code] = getSeries(m.code, 48);
    }
    return NextResponse.json({
      theme,
      themeName: members[0].themeName,
      series: seriesMap,
      meta: Object.fromEntries(members.map((m) => [m.code, m])),
    });
  }

  // 全部指标读数
  const initError = getIndicatorsDbInitError();
  if (initError) {
    return NextResponse.json({ error: initError }, { status: 500 });
  }
  const latest = getLatestAll();
  const indicators: IndicatorDto[] = INDICATOR_META.map((m) => {
    const row = latest[m.code];
    const value = row?.value ?? null;
    const prev = row?.prev_value ?? null;
    return {
      ...m,
      value,
      prev,
      reportDate: row?.report_date ?? null,
      change: value !== null && prev !== null ? Math.round((value - prev) * 100) / 100 : null,
    };
  });

  const res: IndicatorsResponse = {
    indicators,
    themes: buildThemes(),
    updatedAt: getLastFetchAt(),
  };
  return NextResponse.json(res);
}

/** 主题列表（对比图切换用） */
function buildThemes() {
  const out: IndicatorsResponse['themes'] = [];
  for (const [theme, members] of groupByTheme()) {
    out.push({
      theme,
      themeName: members[0].themeName,
      codes: members.map((m) => m.code),
    });
  }
  return out;
}
