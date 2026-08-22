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
  /** 东方财富行情 secid（push2his kline 接口） */
  secid: string;
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
    secid: '1.000001',
    decimals: 2,
    note: '上证综合指数，覆盖上交所全部 A 股与 B 股，中国股市最具代表性的基准。',
  },
  {
    code: 'SZ_399001',
    name: '深证成指',
    region: '中国',
    exchange: '深圳证券交易所',
    secid: '0.399001',
    decimals: 2,
    note: '深证成份指数，选取深交所 500 家有代表性的上市公司，反映深市整体表现。',
  },
  {
    code: 'US_DJIA',
    name: '道琼斯指数',
    region: '美国',
    exchange: '纽约证券交易所',
    secid: '100.DJIA',
    decimals: 2,
    note: '道琼斯工业平均指数，30 家美国大型蓝筹公司，历史最悠久的美国市场指标。',
  },
  {
    code: 'US_NDX',
    name: '纳斯达克指数',
    region: '美国',
    exchange: '纳斯达克交易所',
    secid: '100.NDX',
    decimals: 2,
    note: '纳斯达克综合指数，覆盖纳斯达克全部上市公司，科技成长股占比高。',
  },
  {
    code: 'JP_N225',
    name: '日经 225 指数',
    region: '日本',
    exchange: '东京证券交易所',
    secid: '100.N225',
    decimals: 2,
    note: '日经平均指数，选取东京证交所 225 家有代表性的上市公司，日本市场风向标。',
  },
  {
    code: 'UK_FTSE',
    name: '英国富时 100 指数',
    region: '英国',
    exchange: '伦敦证券交易所',
    secid: '100.FTSE',
    decimals: 2,
    note: '富时 100 指数，伦敦证交所市值最大的 100 家公司，英国蓝筹股基准。',
  },
  {
    code: 'FR_CAC40',
    name: '法国 CAC 40 指数',
    region: '法国',
    exchange: '巴黎证券交易所',
    secid: '100.FCHI',
    decimals: 2,
    note: 'CAC 40 指数，巴黎证交所市值最大的 40 家公司，法国股市基准。',
  },
  {
    code: 'DE_DAX',
    name: '德国 DAX 指数',
    region: '德国',
    exchange: '法兰克福证券交易所',
    secid: '100.GDAXI',
    decimals: 2,
    note: 'DAX 指数，法兰克福证交所市值最大的 40 家公司，德国股市基准。',
  },
];

export const metaByIndexCode = new Map(INDEX_META.map((m) => [m.code, m]));
