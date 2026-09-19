// 投资页黄金/原油指标数据传输类型

export interface GoldOilPointDto {
  date: string;
  close: number | null;
}

export interface GoldOilLatestDto {
  close: number | null;
  prevClose: number | null;
  changePct: number | null;
  tradeDate: string | null;
}

export interface GoldOilItemDto {
  code: string;
  name: string;
  /** 所属板块：gold（黄金）/ oil（原油） */
  group: 'gold' | 'oil';
  /** 单位（美元/盎司、元/克、% 等） */
  unit: string;
  /** 数值显示小数位 */
  decimals: number;
  /** 口径与数据源说明（页面展示） */
  note: string;
  latest: GoldOilLatestDto | null;
  /** 近 3 年日度数据，时间正序 */
  series: GoldOilPointDto[];
}

/** 全球黄金 ETF 持仓（WGC，手动维护，无历史序列） */
export interface GoldEtfDto {
  /** 持仓量（吨） */
  tonnes: number | null;
  /** 数据截止日期 */
  asOf: string | null;
  /** 数据来源说明 */
  source: string;
  /** 维护说明 */
  note: string;
}

export interface GoldOilResponse {
  gold: GoldOilItemDto[];
  oil: GoldOilItemDto[];
  etf: GoldEtfDto;
  updatedAt: string | null;
  dbError: string | null;
}
