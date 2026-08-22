// 投资页「全球货币价值跟踪」数据传输类型

export interface FxPointDto {
  /** YYYY-MM-DD */
  date: string;
  /** 当日收盘汇率（1 美元 = X 本币） */
  close: number | null;
}

export interface FxLatestDto {
  close: number | null;
  prevClose: number | null;
  changePct: number | null;
  tradeDate: string | null;
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
  /** 近 3 年日度值，时间正序 */
  series: FxPointDto[];
}

export interface FxResponse {
  items: FxDto[];
  updatedAt: string | null;
  dbError: string | null;
}
