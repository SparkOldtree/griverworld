// 投资页「全球货币价值跟踪」数据传输类型

export interface FxPointDto {
  /** YYYY-MM */
  month: string;
  /** 月度均值（当月交易日汇率算术平均） */
  avg: number | null;
}

export interface FxLatestDto {
  avg: number | null;
  prevAvg: number | null;
  changePct: number | null;
  month: string | null;
}

export interface FxDto {
  code: string;
  currency: string;
  name: string;
  pairLabel: string;
  country: string;
  decimals: number;
  note: string;
  latest: FxLatestDto | null;
  /** 近 3 年月度均值，时间正序 */
  series: FxPointDto[];
}

export interface FxResponse {
  items: FxDto[];
  updatedAt: string | null;
  dbError: string | null;
}
