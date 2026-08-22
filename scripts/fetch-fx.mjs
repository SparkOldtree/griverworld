#!/usr/bin/env node
/**
 * 汇率采集脚本（全球货币价值跟踪）
 * 数据源：ECB 参考汇率（Frankfurter API，免费无需 key）
 *   https://api.frankfurter.dev/v1/{start}..{end}?base=USD&symbols=CNY,HKD,EUR,GBP,JPY,KRW
 * 口径：统一直接标价「1 美元 = X 本币」；以日度收盘价作为数据点（与股指日频对齐）
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
      // 日频 → 日度收盘序列（直接入库，不做月度聚合）
      const daily = [];
      for (const date of dates) {
        const v = Number(ratesByDate[date]?.[sym]);
        if (!Number.isFinite(v) || v <= 0) continue;
        daily.push({ trade_date: date, close: Math.round(v * 10000) / 10000 });
      }
      if (daily.length === 0) throw new Error('未解析到任何日度数据');

      clearFxSeries(meta.code);
      for (const s of daily) upsertFxSeries(meta.code, s.trade_date, s.close);

      const latest = daily[daily.length - 1];
      const prev = daily.length >= 2 ? daily[daily.length - 2] : null;
      const changePct =
        prev && prev.close !== 0
          ? Number((((latest.close - prev.close) / prev.close) * 100).toFixed(2))
          : null;

      upsertFxLatest(meta.code, latest.close, prev?.close ?? null, changePct, latest.trade_date);
      logFxFetch(meta.code, 'ok', `days=${daily.length} latest=${latest.trade_date}`);
      ok++;
      console.log(
        `✅ ${tag}  OK  共 ${daily.length} 个交易日 | 最新 ${latest.trade_date} 收盘 ${latest.close}` +
          (changePct != null ? ` (日环比 ${changePct >= 0 ? '+' : ''}${changePct}%)` : '')
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
