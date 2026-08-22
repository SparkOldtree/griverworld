// 全球主要股票指数日度收盘采集脚本
// 数据源：东方财富 push2his 行情接口（klt=101 日K线）
// 输出：data/indexes.db 的 index_series / index_latest 表（近 3 年数据）
// 运行：node scripts/fetch-indexes.mjs
// 注意：本机网络可能无法访问 push2his.eastmoney.com（DNS 被调度至不可达节点），
//       生产环境请经由服务器容器执行：docker exec griverworld-app node scripts/fetch-indexes.mjs

import { execFileSync } from 'node:child_process';
import { INDEX_META } from '../src/lib/indexes/meta.ts';
import {
  upsertIndexSeries,
  logIndexFetch,
  getIndexDbInitError,
} from '../src/lib/indexes/db.ts';

const HISTORY_DAYS = 1095; // 近 3 年
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://quote.eastmoney.com/';
const FALLBACK_IPS = ['61.129.129.199', '140.207.67.156', '14.103.188.89'];

function klineUrl(secid, lmt) {
  return (
    'https://push2his.eastmoney.com/api/qt/stock/kline/get' +
    `?secid=${secid}` +
    '&fields1=f1,f2,f3,f4,f5,f6' +
    '&fields2=f51,f53' +
    '&klt=101&fqt=0&beg=0&end=20500101' +
    `&lmt=${lmt}`
  );
}

async function fetchText(url, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Referer: REFERER, Accept: '*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function curlWithFallback(secid, lmt) {
  const url = klineUrl(secid, lmt);
  for (const ip of FALLBACK_IPS) {
    try {
      const out = execFileSync(
        'curl',
        [
          '-4', '-s', '--max-time', '15', '-A', UA,
          '-H', `Referer: ${REFERER}`,
          '--resolve', `push2his.eastmoney.com:443:${ip}`,
          url,
        ],
        { encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 },
      );
      if (out && out.trim().length > 0 && !out.startsWith('{')) continue;
      if (out && out.trim().length > 0) return out;
    } catch { /* try next */ }
  }
  throw new Error('curl fallback 全部失败');
}

async function fetchKline(secid, lmt) {
  const url = klineUrl(secid, lmt);
  let lastErr = null;
  // 1) Node fetch 重试
  for (let i = 0; i < 3; i++) {
    try {
      return await fetchText(url);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  // 2) curl --resolve 兜底（服务器 / 本机不同网络环境）
  try {
    return curlWithFallback(secid, lmt);
  } catch (e) {
    throw lastErr ?? e;
  }
}

function parseKlines(text) {
  try {
    const j = JSON.parse(text);
    if (j.rc !== 0 || !j.data) throw new Error(`接口异常 rc=${j.rc} name=${j.data?.name ?? '?'}`);
    return {
      name: j.data.name ?? '',
      klines: j.data.klines ?? [],
      total: j.data.total ?? 0,
    };
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchOne(meta) {
  // 先拉 lmt=1000000 拿全量，再按 3 年过滤；若 total 较小则直接返回
  const text = await fetchKline(meta.secid, 1000000);
  const { name, klines } = parseKlines(text);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - HISTORY_DAYS);
  const minStr = fmtDate(minDate);

  const rows = [];
  for (const k of klines) {
    // kline 格式：date,close
    const [date, closeStr] = k.split(',');
    if (!date || !closeStr) continue;
    if (date < minStr) continue;
    const close = Number(closeStr);
    if (!Number.isFinite(close)) continue;
    rows.push({ trade_date: date, close });
  }
  rows.sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));

  if (rows.length === 0) throw new Error(`接口返回 ${klines.length} 根 K 线但过滤后为空`);

  const last = rows[rows.length - 1];
  const prev = rows.length >= 2 ? rows[rows.length - 2].close : null;
  const changePct =
    prev != null && prev !== 0
      ? Number((((last.close - prev) / prev) * 100).toFixed(2))
      : null;

  upsertIndexSeries(
    meta.code,
    rows,
    { close: last.close, prev_close: prev, change_pct: changePct, trade_date: last.trade_date },
  );

  return {
    code: meta.code,
    name: name || meta.name,
    count: rows.length,
    latestDate: last.trade_date,
    latestClose: last.close,
    changePct,
  };
}

async function main() {
  const dbErr = getIndexDbInitError();
  if (dbErr) {
    console.error(`[indexes] 数据库初始化失败: ${dbErr}`);
    process.exit(1);
  }

  const results = [];
  let ok = 0;
  let fail = 0;

  for (const meta of INDEX_META) {
    const tag = `[${meta.code}] ${meta.name}`;
    try {
      const r = await fetchOne(meta);
      results.push(r);
      ok++;
      console.log(
        `✅ ${tag}  OK  共 ${r.count} 根K线 | 最新 ${r.latestDate} 收盘 ${r.latestClose}` +
          (r.changePct != null ? ` (${r.changePct >= 0 ? '+' : ''}${r.changePct}%)` : ''),
      );
      logIndexFetch(meta.code, 'ok', `rows=${r.count} latest=${r.latestDate}`);
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ ${tag}  FAIL  ${msg}`);
      logIndexFetch(meta.code, 'error', msg.slice(0, 300));
    }
  }

  console.log(`\n[indexes] 采集完成：成功 ${ok} / 失败 ${fail}（共 ${INDEX_META.length}）`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[indexes] 脚本异常退出:', e);
  process.exit(1);
});
