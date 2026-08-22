#!/usr/bin/env node
/**
 * 宏观指标采集脚本
 * 数据源：东方财富数据中心公开 API（无需 key）
 *  - 中国：RPT_ECONOMY_* 报表
 *  - 美国：RPT_ECONOMICVALUE_USANEW 指标库
 * 输出：data/indicators.db（node:sqlite，增量 upsert）
 *
 * 用法：node scripts/fetch-indicators.mjs [--verbose]
 */
import { execFileSync } from 'node:child_process';
import { INDICATOR_META } from '../src/lib/indicators/meta.ts';
import {
  clearSeries,
  logFetch,
  upsertLatest,
  upsertSeries,
} from '../src/lib/indicators/db.ts';

const BASE = 'https://datacenter-web.eastmoney.com/api/data/v1/get';
const HEADERS = {
  Referer: 'https://data.eastmoney.com/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

const verbose = process.argv.includes('--verbose');
const PAGE_SIZE = 60;

async function fetchEastmoney(reportName, filter = null, sortBy = 'REPORT_DATE') {
  let url = `${BASE}?reportName=${reportName}&columns=ALL&pageNumber=1&pageSize=${PAGE_SIZE}&sortColumns=${sortBy}&sortTypes=-1`;
  if (filter) url += `&filter=${filter}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json?.result?.count === 0) return [];
  return json?.result?.data ?? [];
}

/** 数值换算 */
function transform(v, meta) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
  let n = Number(v);
  const calc = meta.fetch.calc;
  const mult = meta.fetch.unitMult ?? 1;
  if (calc === 'gdp_annualized') {
    // 环比(%) → 折年率(%)
    n = (Math.pow(1 + n / 100, 4) - 1) * 100;
  } else if (calc === 'div_10') {
    n = n / 10;
  } else if (calc === 'div_100') {
    n = n / 100;
  }
  n = n * mult;
  return Math.round(n * 100) / 100;
}

/** 从 REPORT_DATE（'2026-07-01 00:00:00'）提取 YYYY-MM */
function toMonth(dateStr) {
  if (!dateStr) return null;
  return String(dateStr).slice(0, 7);
}

/** 按配置置空异常日期（写入 NULL 保留时间轴位置） */
function applyExclude(series, meta) {
  const exclude = meta.fetch.exclude;
  if (!exclude?.length) return series;
  const set = new Set(exclude);
  for (const s of series) {
    if (set.has(s.date)) s.value = null;
  }
  return series;
}

/** 采集单个中国指标 */
async function fetchCn(meta) {
  const rows = await fetchEastmoney(meta.fetch.ref);
  const series = [];
  for (const row of rows) {
    const v = transform(row[meta.fetch.field], meta);
    if (v === null) continue;
    const d = toMonth(row.REPORT_DATE);
    if (d) series.push({ date: d, value: v });
  }
  return applyExclude(series, meta);
}

/** 采集中国利率报表（如 LPR，按 TRADE_DATE 排序） */
async function fetchCnRate(meta) {
  const rows = await fetchEastmoney(meta.fetch.ref, null, 'TRADE_DATE');
  const series = [];
  for (const row of rows) {
    const v = transform(row[meta.fetch.field], meta);
    if (v === null) continue;
    const d = toMonth(row.TRADE_DATE);
    if (d) series.push({ date: d, value: v });
  }
  return applyExclude(series, meta);
}

/** 日频/周频点列（升序）→ 月度序列（月末值：取每月最后一个有数据的日期） */
function aggregateMonthly(points) {
  const map = new Map();
  for (const p of points) map.set(p.date.slice(0, 7), p.value);
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

/** 采集 FRED 序列（CSV，日/月频 → 月末值） */
async function fetchFred(meta) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${meta.fetch.ref}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': HEADERS['User-Agent'] },
  });
  if (!res.ok) throw new Error(`FRED HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split('\n').slice(1);
  const points = [];
  for (const line of lines) {
    const [date, val] = line.split(',');
    if (!date || !val || val === '.') continue;
    const v = transform(val, meta);
    if (v === null) continue;
    points.push({ date: date.trim(), value: v });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return applyExclude(aggregateMonthly(points), meta);
}

/** 东财行情 K 线（日频 → 月末值）。优先 Node fetch，失败时用 curl 子进程重试兜底 */
async function fetchKline(meta) {
  const secid = meta.fetch.ref;
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&beg=0&end=20500101&lmt=1000000`;

  // 1) Node fetch + 重试
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && text.trim()) return parseKlines(text, meta);
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // 2) curl 子进程兜底（-4 强制 IPv4，--resolve 尝试备用 IP，--retry 网络抖动重试）
  const ua = HEADERS['User-Agent'];
  const commands = [
    ['curl', '-4', '-s', '--max-time', '20', '-A', ua, url],
    ['curl', '-4', '-s', '--max-time', '20', '-A', ua, '--resolve', `push2his.eastmoney.com:443:61.129.129.199`, url],
    ['curl', '-4', '-s', '--max-time', '20', '-A', ua, '--resolve', `push2his.eastmoney.com:443:140.207.67.156`, url],
  ];
  let lastErr = new Error('K 线接口全部尝试失败');
  for (const cmd of commands) {
    try {
      const out = execFileSync(cmd[0], cmd.slice(1), { encoding: 'utf8', timeout: 30000 });
      if (out && out.trim()) return parseKlines(out, meta);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** 解析 K 线响应文本 → 日频点列（收盘价） */
function parseKlines(text, meta) {
  const json = JSON.parse(text);
  const klines = json?.data?.klines ?? [];
  const points = [];
  for (const k of klines) {
    const parts = String(k).split(',');
    if (parts.length < 6) continue;
    const v = transform(parts[2], meta); // f53 收盘
    if (v === null) continue;
    points.push({ date: parts[0], value: v });
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  return applyExclude(aggregateMonthly(points), meta);
}

/** 采集单个美国指标 */
async function fetchUs(meta) {
  const filter = `(INDICATOR_ID="${meta.fetch.ref}")`;
  const rows = await fetchEastmoney('RPT_ECONOMICVALUE_USANEW', filter);
  const series = [];
  for (const row of rows) {
    const v = transform(row.VALUE, meta);
    if (v === null) continue; // 跳过未发布的预报值
    const d = toMonth(row.REPORT_DATE);
    if (d) series.push({ date: d, value: v });
  }
  return applyExclude(series, meta);
}

async function main() {
  const summary = [];
  let okCount = 0;
  let pendingCount = 0;
  let failCount = 0;

  for (const meta of INDICATOR_META) {
    const code = meta.code;
    if (meta.status === 'pending') {
      pendingCount++;
      logFetch(code, 'pending', '数据源待接入');
      summary.push({ code, name: meta.name, status: 'pending' });
      if (verbose) console.log(`[${code}] pending（数据源待接入）`);
      continue;
    }

    try {
      const series =
        meta.fetch.kind === 'us_indicator'
          ? await fetchUs(meta)
          : meta.fetch.kind === 'cn_rate'
            ? await fetchCnRate(meta)
            : meta.fetch.kind === 'fred'
              ? await fetchFred(meta)
              : meta.fetch.kind === 'cn_kline'
                ? await fetchKline(meta)
                : await fetchCn(meta);

      if (series.length === 0) {
        logFetch(code, 'error', '未获取到数据');
        summary.push({ code, name: meta.name, status: 'error', msg: 'empty' });
        failCount++;
        continue;
      }

      // 按日期升序后整体覆盖（增量 + 修正）
      series.sort((a, b) => a.date.localeCompare(b.date));
      clearSeries(code);
      for (const s of series) upsertSeries(code, s.date, s.value);

      // 最新值与上期值
      const values = series.map((s) => s.value);
      const latest = values[values.length - 1];
      const prev = values.length >= 2 ? values[values.length - 2] : null;
      const latestDate = series[series.length - 1].date;

      upsertLatest(code, latest, prev, latestDate);
      logFetch(code, 'ok', `${series.length} 期`);
      okCount++;
      summary.push({
        code,
        name: meta.name,
        status: 'ok',
        date: latestDate,
        value: latest,
        prev: prev,
        n: series.length,
      });
      if (verbose) {
        console.log(
          `[${code}] ok  ${latestDate} = ${latest}（上期 ${prev}），共 ${series.length} 期`
        );
      }
    } catch (e) {
      logFetch(code, 'error', e.message);
      failCount++;
      summary.push({ code, name: meta.name, status: 'error', msg: e.message });
      console.error(`[${code}] 采集失败: ${e.message}`);
    }
  }

  console.log('\n===== 采集汇总 =====');
  for (const s of summary) {
    if (s.status === 'ok') {
      console.log(`  OK    ${s.code}  ${s.date} = ${s.value}（上期 ${s.prev}）`);
    } else if (s.status === 'pending') {
      console.log(`  PEND  ${s.code}  数据源待接入`);
    } else {
      console.log(`  FAIL  ${s.code}  ${s.msg}`);
    }
  }
  console.log(`\n成功 ${okCount} / 待接入 ${pendingCount} / 失败 ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('脚本执行失败:', e);
  process.exit(1);
});
