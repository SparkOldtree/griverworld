#!/usr/bin/env node
/**
 * 汇率采集脚本（全球货币价值跟踪）
 * 数据源：ECB 参考汇率（Frankfurter API，免费无需 key）
 *   https://api.frankfurter.dev/v1/{start}..{end}?base=USD&symbols=CNY,HKD,EUR,GBP,JPY,KRW
 * 口径：统一直接标价「1 美元 = X 本币」；以月度均值作为数据点
 *   （当月所有交易日汇率的算术平均，最新月为当月至今均值）
 * 窗口：近 3 年（与股指 HISTORY_DAYS=1095 对齐）
 * 输出：data/fx.db（node:sqlite，增量 upsert）
 * 运行：node scripts/fetch-fx.mjs [--verbose]
 */
import { execFileSync } from 'node:child_process';
import { FX_META } from '../src/lib/fx/meta.ts';
import {
  clearFxSeries,
  logFxFetch,
  upsertFxLatest,
  upsertFxSeries,
  getFxDbInitError,
} from '../src/lib/fx/db.ts';

const HISTORY_DAYS = 1095; // 近 3 年，与指数对齐
const API_BASE = 'https://api.frankfurter.dev/v1';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const verbose = process.argv.includes('--verbose');

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** 抓取 ECB 参考汇率（日频）→ 解析为 { date: { SYMBOL: rate } } */
async function fetchFxRates() {
  const start = new Date();
  start.setDate(start.getDate() - HISTORY_DAYS);
  const url = `${API_BASE}/${fmtDate(start)}..${fmtDate(new Date())}?base=USD&symbols=${FX_META.map((m) => m.symbol).join(',')}`;

  // 1) Node fetch + 重试（跟随重定向）
  for (let i = 0; i < 3; i++) {
    try {
      const j = await fetchJson(url);
      if (j?.rates && typeof j.rates === 'object') return j.rates;
      throw new Error('接口返回结构异常');
    } catch (e) {
      if (verbose) console.log(`  ↳ fetch 重试 ${i + 1}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }

  // 2) curl 子进程兜底（-L 跟随 301）
  let lastErr = new Error('Frankfurter 接口全部尝试失败');
  for (const cmd of [
    ['curl', '-4', '-sL', '--max-time', '25', '-A', UA, url],
    ['curl', '-sL', '--max-time', '25', '-A', UA, url],
  ]) {
    try {
      const out = execFileSync(cmd[0], cmd.slice(1), { encoding: 'utf8', timeout: 35000 });
      if (!out.trim()) throw new Error('curl 返回空');
      const j = JSON.parse(out);
      if (j?.rates && typeof j.rates === 'object') return j.rates;
      throw new Error('curl 返回结构异常');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function main() {
  const dbErr = getFxDbInitError();
  if (dbErr) {
    console.error(`[fx] 数据库初始化失败: ${dbErr}`);
    process.exit(1);
  }

  const ratesByDate = await fetchFxRates();
  const dates = Object.keys(ratesByDate).sort();

  let ok = 0;
  let fail = 0;

  for (const meta of FX_META) {
    const sym = meta.symbol;
    const tag = `[${meta.code}] ${meta.name} (${sym})`;
    try {
      // 日频 → 月度均值
      const monthly = new Map(); // YYYY-MM -> { sum, n }
      for (const date of dates) {
        const v = Number(ratesByDate[date]?.[sym]);
        if (!Number.isFinite(v) || v <= 0) continue;
        const month = date.slice(0, 7);
        const cur = monthly.get(month) ?? { sum: 0, n: 0 };
        cur.sum += v;
        cur.n += 1;
        monthly.set(month, cur);
      }
      if (monthly.size === 0) throw new Error('未解析到任何月度数据');

      const series = [...monthly.entries()]
        .map(([month, { sum, n }]) => ({ month, avg: Math.round((sum / n) * 10000) / 10000 }))
        .sort((a, b) => (a.month < b.month ? -1 : 1));

      clearFxSeries(meta.code);
      for (const s of series) upsertFxSeries(meta.code, s.month, s.avg);

      const latest = series[series.length - 1];
      const prev = series.length >= 2 ? series[series.length - 2] : null;
      const changePct =
        prev && prev.avg !== 0
          ? Number((((latest.avg - prev.avg) / prev.avg) * 100).toFixed(2))
          : null;

      upsertFxLatest(meta.code, latest.avg, prev?.avg ?? null, changePct, latest.month);
      logFxFetch(meta.code, 'ok', `months=${series.length} latest=${latest.month}`);
      ok++;
      console.log(
        `✅ ${tag}  OK  共 ${series.length} 个月度点 | 最新 ${latest.month} 均值 ${latest.avg}` +
          (changePct != null ? ` (环比 ${changePct >= 0 ? '+' : ''}${changePct}%)` : '')
      );
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`❌ ${tag}  FAIL  ${msg}`);
      logFxFetch(meta.code, 'error', msg.slice(0, 300));
    }
  }

  console.log(`\n[fx] 采集完成：成功 ${ok} / 失败 ${fail}（共 ${FX_META.length}）`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('[fx] 脚本异常退出:', e);
  process.exit(1);
});
