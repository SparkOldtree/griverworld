// 汇率跟踪元数据
// 数据源：ECB 参考汇率（Frankfurter API），统一直接标价「1 美元 = X 本币」
// 数据点：日度收盘（每日 ECB 参考汇率），时间窗口与股指对齐（近 3 年）

export interface FxMeta {
  /** 唯一标识，统一为 USD + 本币 ISO 码 */
  code: string;
  /** 货币中文名 */
  currency: string;
  /** 展示名（货币名） */
  name: string;
  /** 货币对标签，如 USD/CNY */
  pairLabel: string;
  /** 国家 / 地区 */
  country: string;
  /** Frankfurter 符号 */
  symbol: string;
  /** 展示小数位 */
  decimals: number;
  /** 备注 */
  note: string;
}

export const FX_META: FxMeta[] = [
  {
    code: 'USDCNY',
    currency: '人民币',
    name: '人民币',
    pairLabel: 'USD/CNY',
    country: '中国',
    symbol: 'CNY',
    decimals: 4,
    note: '1 美元兑人民币（ECB 参考汇率）',
  },
  {
    code: 'USDHKD',
    currency: '港币',
    name: '港币',
    pairLabel: 'USD/HKD',
    country: '中国香港',
    symbol: 'HKD',
    decimals: 4,
    note: '1 美元兑港币（联系汇率制度）',
  },
  {
    code: 'USDEUR',
    currency: '欧元',
    name: '欧元',
    pairLabel: 'USD/EUR',
    country: '欧元区',
    symbol: 'EUR',
    decimals: 4,
    note: '1 美元兑欧元',
  },
  {
    code: 'USDGBP',
    currency: '英镑',
    name: '英镑',
    pairLabel: 'USD/GBP',
    country: '英国',
    symbol: 'GBP',
    decimals: 4,
    note: '1 美元兑英镑',
  },
  {
    code: 'USDJPY',
    currency: '日元',
    name: '日元',
    pairLabel: 'USD/JPY',
    country: '日本',
    symbol: 'JPY',
    decimals: 2,
    note: '1 美元兑日元',
  },
  {
    code: 'USDKRW',
    currency: '韩元',
    name: '韩元',
    pairLabel: 'USD/KRW',
    country: '韩国',
    symbol: 'KRW',
    decimals: 0,
    note: '1 美元兑韩元',
  },
];
