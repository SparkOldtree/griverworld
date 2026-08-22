import type { IndicatorMeta } from './meta';

/** 指标 + 最新读数（热力图 / 解读卡片用） */
export interface IndicatorDto extends IndicatorMeta {
  value: number | null;
  prev: number | null;
  reportDate: string | null;
  change: number | null;
  /** 近 12 期历史序列（卡片趋势图用，时间正序） */
  spark: { report_date: string; value: number | null }[];
}

/** 主题对比序列 */
export interface ThemeSeriesDto {
  theme: string;
  themeName: string;
  series: Record<string, { report_date: string; value: number | null }[]>;
  meta: Record<string, IndicatorMeta>;
}

/** 主题列表项 */
export interface ThemeItem {
  theme: string;
  themeName: string;
  codes: string[];
}

/** 全部指标响应 */
export interface IndicatorsResponse {
  indicators: IndicatorDto[];
  themes: ThemeItem[];
  updatedAt: string | null;
}
