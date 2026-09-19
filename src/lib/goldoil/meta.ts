// 黄金/原油核心指标元数据（投资页第三、四板块）
// 采集配置与展示元数据统一维护，采集脚本（scripts/fetch-goldoil.mjs）与前端共用
//
// 数据源说明：
//   - sina_global：新浪全球期货历史日线（GlobalFuturesService.getGlobalFuturesDailyKLine）
//       外盘：XAU 伦敦金 / XAG 伦敦银 / OIL 布伦特 / CL 纽约原油（数十年历史）
//   - sina_inner：新浪国内期货历史日线（InnerFuturesNewService.getDailyKLine）
//       内盘：AU0 沪金主力连续 / SC0 上海原油连续
//   - treasury：美国财政部官方日度收益率曲线 CSV（名义收益率 / TIPS 实际收益率）
//   - derived：金银比 = XAU/XAG 同日收盘比（采集脚本计算）

export interface GoldOilMeta {
  /** 内部代码（数据库主键） */
  code: string;
  /** 展示名 */
  name: string;
  /** 所属板块 */
  group: 'gold' | 'oil';
  /** 单位 */
  unit: string;
  /** 数据源 */
  source: 'sina_global' | 'sina_inner' | 'treasury_nominal' | 'treasury_real' | 'derived_ratio';
  /** 新浪行情代码（sina_global / sina_inner） */
  quoteSymbol?: string;
  /** 数值显示小数位 */
  decimals: number;
  /** 口径与来源说明（页面展示） */
  note: string;
}

export const GOLDOIL_META: GoldOilMeta[] = [
  {
    code: 'XAU_USD',
    name: '伦敦金现货 XAU/USD',
    group: 'gold',
    unit: '美元/盎司',
    source: 'sina_global',
    quoteSymbol: 'XAU',
    decimals: 2,
    note: '伦敦现货黄金（XAU/USD），全球黄金定价基准，24 小时场外交易。数据源：新浪全球期货行情，日度收盘。',
  },
  {
    code: 'AU9999',
    name: '上海金 Au99.99',
    group: 'gold',
    unit: '元/克',
    source: 'sina_inner',
    quoteSymbol: 'AU0',
    decimals: 2,
    note: '趋势为沪金期货主力连续（AU0），与 SGE Au99.99 现货走势高度同步但口径略有差异；SGE 现货无免费历史接口，特此标注。数据源：新浪国内期货行情，日度收盘。',
  },
  {
    code: 'US10Y_TIPS',
    name: '10 年期 TIPS 实际利率',
    group: 'gold',
    unit: '%',
    source: 'treasury_real',
    decimals: 2,
    note: '美国 10 年期通胀保值国债（TIPS）实际收益率，持有黄金的机会成本，与金价通常负相关。数据源：美国财政部官方日度收益率曲线。',
  },
  {
    code: 'US10Y_NOMINAL',
    name: '10 年期美债名义收益率',
    group: 'gold',
    unit: '%',
    source: 'treasury_nominal',
    decimals: 2,
    note: '美国 10 年期国债名义收益率，全球无风险利率之锚。数据源：美国财政部官方日度收益率曲线。',
  },
  {
    code: 'GOLD_SILVER_RATIO',
    name: '金银比 Gold/Silver',
    group: 'gold',
    unit: '比值',
    source: 'derived_ratio',
    decimals: 1,
    note: '伦敦金与伦敦银同日收盘价之比。历史上金银比高位常对应经济衰退或市场恐慌，低位对应贵金属牛市。由 XAU/XAG 日度收盘计算。',
  },
  {
    code: 'BRENT',
    name: 'Brent 原油（ICE）',
    group: 'oil',
    unit: '美元/桶',
    source: 'sina_global',
    quoteSymbol: 'OIL',
    decimals: 2,
    note: '布伦特原油连续（ICE），全球三分之二原油现货的定价基准。数据源：新浪全球期货行情，日度收盘。',
  },
  {
    code: 'WTI',
    name: 'WTI 原油（NYMEX CL）',
    group: 'oil',
    unit: '美元/桶',
    source: 'sina_global',
    quoteSymbol: 'CL',
    decimals: 2,
    note: '纽约商品交易所 WTI 原油连续（CL），美国原油定价基准，与 Brent 的价差反映区域供需。数据源：新浪全球期货行情，日度收盘。',
  },
  {
    code: 'SC',
    name: '上海原油期货 SC',
    group: 'oil',
    unit: '元/桶',
    source: 'sina_inner',
    quoteSymbol: 'SC0',
    decimals: 2,
    note: '上海国际能源交易中心原油期货主力连续（SC），以人民币计价的中国原油基准。数据源：新浪国内期货行情，日度收盘。',
  },
];

export const metaByGoldOilCode = new Map(GOLDOIL_META.map((m) => [m.code, m]));
