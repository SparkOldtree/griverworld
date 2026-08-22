// 全球主要股票指数元数据（投资页指数趋势卡片）
// 采集配置与展示元数据统一维护，采集脚本（scripts/fetch-indexes.mjs）与前端共用

export interface IndexMeta {
  /** 内部代码（数据库主键） */
  code: string;
  /** 展示名 */
  name: string;
  /** 区域（中国 / 美国 / 日本 / 英国 / 法国 / 德国） */
  region: string;
  /** 交易所 */
  exchange: string;
  /** 数据源：tencent（A股指数，web.ifzq.gtimg.cn）/ cnbc（海外指数，ts-api.cnbc.com） */
  source: 'tencent' | 'cnbc';
  /** 数据源行情代码：腾讯 sh000001 / sz399001；CNBC .DJI / .IXIC 等 */
  quoteSymbol: string;
  /** 点位显示小数位 */
  decimals: number;
  /** 点位展示精度说明（用于 tooltip/说明） */
  note: string;
}

export const INDEX_META: IndexMeta[] = [
  {
    code: 'SH_000001',
    name: '上证指数',
    region: '中国',
    exchange: '上海证券交易所',
    source: 'tencent',
    quoteSymbol: 'sh000001',
    decimals: 2,
    note: '上证综合指数，覆盖上交所全部 A 股与 B 股，中国股市最具代表性的基准。',
  },
  {
    code: 'SZ_399001',
    name: '深证成指',
    region: '中国',
    exchange: '深圳证券交易所',
    source: 'tencent',
    quoteSymbol: 'sz399001',
    decimals: 2,
    note: '深证成份指数，选取深交所 500 家有代表性的上市公司，反映深市整体表现。',
  },
  {
    code: 'SH_000688',
    name: '科创50',
    region: '中国',
    exchange: '上海证券交易所（科创板）',
    source: 'tencent',
    quoteSymbol: 'sh000688',
    decimals: 2,
    note: '科创50 指数，选取科创板市值与流动性前 50 家上市公司，集中反映硬科技企业整体表现。',
  },
  {
    code: 'SZ_399006',
    name: '创业板指',
    region: '中国',
    exchange: '深圳证券交易所',
    source: 'tencent',
    quoteSymbol: 'sz399006',
    decimals: 2,
    note: '创业板指数，选取创业板市值与流动性居前的 100 家上市公司，反映深市成长型科技企业表现。',
  },
  {
    code: 'HK_HSTECH',
    name: '恒生科技指数',
    region: '中国',
    exchange: '香港交易所',
    source: 'tencent',
    quoteSymbol: 'hkHSTECH',
    decimals: 2,
    note: '恒生科技指数，追踪港股上市的 30 家最大科技公司，覆盖互联网、科技平台与科技金融龙头。',
  },
  {
    code: 'US_DJIA',
    name: '道琼斯指数',
    region: '美国',
    exchange: '纽约证券交易所',
    source: 'cnbc',
    quoteSymbol: '.DJI',
    decimals: 2,
    note: '道琼斯工业平均指数，30 家美国大型蓝筹公司，历史最悠久的美国市场指标。',
  },
  {
    code: 'US_NDX',
    name: '纳斯达克指数',
    region: '美国',
    exchange: '纳斯达克交易所',
    source: 'cnbc',
    quoteSymbol: '.IXIC',
    decimals: 2,
    note: '纳斯达克综合指数，覆盖纳斯达克全部上市公司，科技成长股占比高。',
  },
  {
    code: 'JP_N225',
    name: '日经 225 指数',
    region: '日本',
    exchange: '东京证券交易所',
    source: 'cnbc',
    quoteSymbol: '.N225',
    decimals: 2,
    note: '日经平均指数，选取东京证交所 225 家有代表性的上市公司，日本市场风向标。',
  },
  {
    code: 'UK_FTSE',
    name: '英国富时 100 指数',
    region: '英国',
    exchange: '伦敦证券交易所',
    source: 'cnbc',
    quoteSymbol: '.FTSE',
    decimals: 2,
    note: '富时 100 指数，伦敦证交所市值最大的 100 家公司，英国蓝筹股基准。',
  },
  {
    code: 'FR_CAC40',
    name: '法国 CAC 40 指数',
    region: '法国',
    exchange: '巴黎证券交易所',
    source: 'cnbc',
    quoteSymbol: '.FCHI',
    decimals: 2,
    note: 'CAC 40 指数，巴黎证交所市值最大的 40 家公司，法国股市基准。',
  },
  {
    code: 'DE_DAX',
    name: '德国 DAX 指数',
    region: '德国',
    exchange: '法兰克福证券交易所',
    source: 'cnbc',
    quoteSymbol: '.GDAXI',
    decimals: 2,
    note: 'DAX 指数，法兰克福证交所市值最大的 40 家公司，德国股市基准。',
  },
  {
    code: 'KR_KOSPI',
    name: '韩国 KOSPI 指数',
    region: '韩国',
    exchange: '韩国交易所',
    source: 'cnbc',
    quoteSymbol: '.KS11',
    decimals: 2,
    note: 'KOSPI 综合指数，覆盖韩国交易所全部上市公司，韩国股市最具代表性的基准。',
  },
];

export const metaByIndexCode = new Map(INDEX_META.map((m) => [m.code, m]));
