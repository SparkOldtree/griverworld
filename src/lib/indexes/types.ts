// 投资页指数趋势卡片的数据传输类型

export interface IndexPointDto {
  date: string;
  close: number | null;
}

export interface IndexLatestDto {
  close: number | null;
  prevClose: number | null;
  changePct: number | null;
  tradeDate: string | null;
}

export interface IndexDto {
  code: string;
  name: string;
  region: string;
  exchange: string;
  decimals: number;
  note: string;
  latest: IndexLatestDto | null;
  /** 近 3 年日度收盘，时间正序 */
  series: IndexPointDto[];
}

export interface IndexesResponse {
  indexes: IndexDto[];
  updatedAt: string | null;
  dbError: string | null;
}
