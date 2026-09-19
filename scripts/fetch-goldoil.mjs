#!/usr/bin/env node
/**
 * 黄金/原油核心指标日度采集脚本（投资页第三、四板块）
 * 数据源：
 *   - 新浪全球期货历史日线（GlobalFuturesService.getGlobalFuturesDailyKLine）
 *       XAU 伦敦金 / XAG 伦敦银 / OIL 布伦特原油 / CL 纽约原油
 *   - 新浪国内期货历史日线（InnerFuturesNewService.getDailyKLine）
 *       AU0 沪金主力连续 / SC0 上海原油连续
 *   - 美国财政部官方日度收益率曲线 CSV（近 3 年逐年拉取）
 *       10Y 名义收益率 / 10Y TIPS 实际收益率
 *   - 金银比 = XAU/XAG 同日收盘比（本地计算）
 * 输出：data/goldoil.db 的 goldoil_series / goldoil_latest 表（近 3 年）
 * 运行：node scripts/fetch-goldoil.mjs
 * 注意：生产环境请经由服务器容器执行：docker exec griverworld-app node scripts/fetch-goldoil.mjs
 */

import { GOLDOIL_META } from '../src/lib/goldoil/meta.ts';
import {
  upsertGoldOilSeries,
  logGoldOilFetch,
  getGoldOilDbInitError,
} from '../src/lib/goldoil/db.ts';

const HISTORY_DAYS = 1095; // 近 3 年，与指数/汇率对齐
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SINA_GLOBAL_URL = 'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20t=/GlobalFuturesService.getGlobalFuturesDailyKLine';
const SINA_INNER_URL = 'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20t=/InnerFuturesNewService.getDailyKLine';
const SINA_REFERER = 'https://finance.sina.com.cn';
const TREASURY_URL = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv';

async function fetchText(url, referer, timeoutMs = 25000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        ...(referer ? { Referer: referer } : {}),
        Accept: '*/*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** 从新浪 JSONP 响应中提取 JSON 数组 */
function extractJsonpArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('JSONP 数组提取失败');
  }
  return JSON.parse(text.slice(start, end + 1));
}

function cutoffDate() {
  const d = new Date();
  d.setDate(d.getDate() - HISTORY_DAYS);
  return d.toISOString().slice(0, 10);
}

/** 新浪全球期货历史日线（外盘：XAU/XAG/OIL/CL） */
async function fetchSinaGlobal(symbol) {
  const text = await fetchText(`${SINA_GLOBAL_URL}?symbol=${symbol}`, SINA_REFERER);
  const arr = extractJsonpArray(text);
  const cutoff = cutoffDate();
  const rows = [];
  for (const k of arr) {
    const date = String(k.date ?? '').slice(0, 10);
    const close = Number(k.close);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close) || date < cutoff) continue;
    rows.push({ trade_date: date, close });
  }
  if (rows.length === 0) throw new Error('无有效数据行');
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  return rows;
}

/** 新浪国内期货历史日线（内盘：AU0/SC0） */
async function fetchSinaInner(symbol) {
  const text = await fetchText(`${SINA_INNER_URL}?symbol=${symbol}`, SINA_REFERER);
  const arr = extractJsonpArray(text);
  const cutoff = cutoffDate();
  const rows = [];
  for (const k of arr) {
    const date = String(k.d ?? '').slice(0, 10);
    const close = Number(k.c);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(close) || date < cutoff) continue;
    rows.push({ trade_date: date, close });
  }
  if (rows.length === 0) throw new Error('无有效数据行');
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  return rows;
}

/** 美国财政部日度收益率曲线 CSV（近 3 年逐年拉取），取指定列 */
async function fetchTreasury(type, column) {
  const years = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) years.push(now.getFullYear() - i);
  const cutoff = cutoffDate();
  const map = new Map(); // date -> value（同年份重复请求不会发生，跨年安全）
  for (const year of years) {
    const url = `${TREASURY_URL}/${year}/all?type=${type}&field_tdr_date_value=${year}&page&_format=csv`;
    const text = await fetchText(url, null, 30000);
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error(`CSV 行数异常（${year}）`);
    const header = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
    const colIdx = header.findIndex((h) => h.toLowerCase() === column.toLowerCase());
    if (colIdx === -1) throw new Error(`CSV 缺少列 ${column}（${year}）`);
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',');
      if (cells.length <= colIdx) continue;
      const raw = (cells[colIdx] ?? '').replace(/"/g, '').trim();
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((cells[0] ?? '').replace(/"/g, '').trim());
      const value = Number(raw);
      if (!m || !Number.isFinite(value) || value === 0) continue;
      const date = `${m[3]}-${m[1]}-${m[2]}`;
      if (date < cutoff) continue;
      map.set(date, value);
    }
  }
  const rows = [...map.entries()]
    .map(([trade_date, close]) => ({ trade_date, close }))
    .sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
  if (rows.length === 0) throw new Error('无有效数据行');
  return rows;
}

/** 金银比：XAU/XAG 同日收盘比 */
function deriveRatio(xauRows, xagRows) {
  const xagMap = new Map(xagRows.map((r) => [r.trade_date, r.close]));
  const rows = [];
  for (const r of xauRows) {
    const ag = xagMap.get(r.trade_date);
    if (ag && ag > 0) {
      rows.push({ trade_date: r.trade_date, close: Number((r.close / ag).toFixed(3)) });
    }
  }
  if (rows.length === 0) throw new Error('金银比无有效数据行');
  return rows;
}

async function main() {
  const dbErr = getGoldOilDbInitError();
  if (dbErr) {
    console.error(`[goldoil] 数据库初始化失败：${dbErr}`);
    process.exit(1);
  }

  const cutoff = cutoffDate();
  console.log(`[goldoil] 采集窗口：${cutoff} 之后，共 ${GOLDOIL_META.length} 个指标`);

  // XAU/XAG 原始序列（金银比需要），先拉一次缓存
  const sinaGlobalCache = new Map();

  const results = [];
  const errors = [];

  for (const meta of GOLDOIL_META) {
    try {
      let rows;
      if (meta.source === 'sina_global') {
        if (!sinaGlobalCache.has(meta.quoteSymbol)) {
          sinaGlobalCache.set(meta.quoteSymbol, await fetchSinaGlobal(meta.quoteSymbol));
        }
        rows = sinaGlobalCache.get(meta.quoteSymbol);
      } else if (meta.source === 'sina_inner') {
        rows = await fetchSinaInner(meta.quoteSymbol);
      } else if (meta.source === 'treasury_nominal') {
        rows = await fetchTreasury('daily_treasury_yield_curve', '10 Yr');
      } else if (meta.source === 'treasury_real') {
        rows = await fetchTreasury('daily_treasury_real_yield_curve', '10 YR');
      } else if (meta.source === 'derived_ratio') {
        if (!sinaGlobalCache.has('XAU')) sinaGlobalCache.set('XAU', await fetchSinaGlobal('XAU'));
        if (!sinaGlobalCache.has('XAG')) sinaGlobalCache.set('XAG', await fetchSinaGlobal('XAG'));
        rows = deriveRatio(sinaGlobalCache.get('XAU'), sinaGlobalCache.get('XAG'));
      } else {
        throw new Error(`未知数据源 ${meta.source}`);
      }

      const { inserted, latestTradeDate } = upsertGoldOilSeries(meta.code, rows);
      logGoldOilFetch(meta.code, 'ok', `${inserted} 行，最新 ${latestTradeDate}`);
      results.push({ code: meta.code, ok: true, inserted, latest: latestTradeDate });
      console.log(`[goldoil] OK   ${meta.code}: ${inserted} 行，最新 ${latestTradeDate}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logGoldOilFetch(meta.code, 'error', msg);
      errors.push({ code: meta.code, error: msg });
      console.error(`[goldoil] FAIL ${meta.code}: ${msg}`);
    }
  }

  console.log('');
  console.log(`[goldoil] 采集完成：成功 ${results.length}/${GOLDOIL_META.length}，失败 ${errors.length}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`[goldoil] 失败明细 ${e.code}: ${e.error}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error('[goldoil] 运行异常：', e);
  process.exit(1);
});
