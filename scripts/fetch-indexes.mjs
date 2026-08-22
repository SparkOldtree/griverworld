// 全球主要股票指数日度收盘采集脚本
// 数据源（双通道，按 meta.source 分流）：
//   - tencent：A股指数（上证 sh000001 / 深成 sz399001）
//     接口 web.ifzq.gtimg.cn/appstock/app/fqkline/get（count=800 覆盖 3 年以上）
//   - cnbc：海外指数（.DJI / .IXIC / .N225 / .FTSE / .FCHI / .GDAXI）
//     接口 ts-api.cnbc.com/harmony/app/charts/6M.json（近 3 年日线，753 根左右）
// 输出：data/indexes.db 的 index_series / index_latest 表（近 3 年数据）
// 运行：node scripts/fetch-indexes.mjs
// 注意：生产环境请经由服务器容器执行：docker exec griverworld-app node scripts/fetch-indexes.mjs

import { INDEX_META } from '../src/lib/indexes/meta.ts';
import {
  upsertIndexSeries,
  logIndexFetch,
  getIndexDbInitError,
} from '../src/lib/indexes/db.ts';

const HISTORY_DAYS = 1095; // 近 3 年
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TENCENT_URL = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get';
const CNBC_URL = 'https://ts-api.cnbc.com/harmony/app/charts/6M.json';

function tencentUrl(symbol) {
  // param=代码,day,开始,结束,数量,复权 —— 留空区间按数量倒序取最近 N 根
  return `${TENCENT_URL}?param=${symbol},day,,,800,qfq`;
}

function cnbcUrl(symbol) {
  return `${CNBC_URL}?symbol=${symbol}`;
}

async function fetchText(url, referer, timeoutMs = 20000) {
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

async function fetchWithRetry(url, referer, times = 3) {
  let lastErr = null;
  for (let i = 0; i < times; i++) {
    try {
      return await fetchText(url, referer);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr ?? new Error(`请求失败: ${url}`);
}

/** 腾讯 K 线解析：data.<symbol>.day[]，每根 [date, open, close, high, low, volume] */
function parseTencent(symbol, text) {
  const j = JSON.parse(text);
  const node = j?.data?.[symbol];
  if (j?.code !== 0 || !node) throw new Error(`腾讯接口异常 code=${j?.code} symbol=${symbol}`);
  const arr = node.qfqday ?? node.day ?? [];
  if (!Array.isArray(arr) || arr.length === 0) throw new Error(`腾讯接口返回空数组 symbol=${symbol}`);
  return { name: node?.qt?.name ?? '', klines: arr };
}

/** CNBC 历史解析：barData.priceBars[]，每根 { tradeTime: "YYYYMMDDHHmmss", close } */
function parseCnbc(symbol, text) {
  const j = JSON.parse(text);
  const bars = j?.barData?.priceBars;
  if (!Array.isArray(bars) || bars.length === 0) {
    throw new Error(`CNBC 接口返回空 bars symbol=${symbol}`);
  }
  return { name: j?.barData?.companyName ?? '', klines: bars };
}

/** CNBC 实时兜底：返回 { last, date }，失败或不可用时返回 null */
async function fetchCnbcRealtime(symbol) {
  const url =
    'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol' +
    `?symbols=${encodeURIComponent(symbol)}` +
    '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json';
  const text = await fetchText(url, null, 15000);
  const j = JSON.parse(text);
  const q = j?.FormattedQuoteResult?.FormattedQuote?.[0];
  if (!q || q?.code !== 0) return null;
  const last = Number(String(q.last ?? '').replace(/,/g, ''));
  const date = q.last_time;
  if (!Number.isFinite(last) || !date) return null;
  return { last, date };
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** CNBC tradeTime "20260821000000" → "2026-08-21" */
function cnbcDateToIso(s) {
  if (s && s.length >= 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

async function fetchOne(meta) {
  let name;
  let klines;

  if (meta.source === 'tencent') {
    const text = await fetchWithRetry(tencentUrl(meta.quoteSymbol), 'https://finance.qq.com/');
    ({ name, klines } = parseTencent(meta.quoteSymbol, text));
  } else if (meta.source === 'cnbc') {
    const text = await fetchWithRetry(cnbcUrl(meta.quoteSymbol), null);
    ({ name, klines } = parseCnbc(meta.quoteSymbol, text));
    // 实时兜底：6M 历史若缺最新交易日（CDN 缓存时延），用实时收盘价补齐
    try {
      const rt = await fetchCnbcRealtime(meta.quoteSymbol);
      if (rt) {
        const lastBar = klines[klines.length - 1];
        const lastDate = cnbcDateToIso(lastBar?.tradeTime);
        if (rt.date > lastDate) {
          klines.push({
            tradeTime: rt.date.replace(/-/g, '') + '000000',
            close: String(rt.last),
          });
          console.log(`  ↳ [${meta.code}] CNBC 历史缺 ${rt.date}，实时兜底补齐 close=${rt.last}`);
        }
      }
    } catch {
      /* 实时兜底失败则仅用历史数据 */
    }
  } else {
    throw new Error(`未知数据源 ${meta.source}`);
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() - HISTORY_DAYS);
  const minStr = fmtDate(minDate);

  const rows = [];
  for (const k of klines) {
    // 腾讯 K 线：数组 [date, open, close, high, low, volume]；CNBC：对象 {tradeTime, close}
    const date = Array.isArray(k) ? k[0] : cnbcDateToIso(k?.tradeTime);
    const closeStr = Array.isArray(k) ? k[2] : k?.close;
    if (!date || closeStr == null) continue;
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
    const tag = `[${meta.code}] ${meta.name} (${meta.source}:${meta.quoteSymbol})`;
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
