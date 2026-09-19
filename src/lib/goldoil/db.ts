// 黄金/原油指标日度数据访问层（data/goldoil.db）
// 与指数库（indexes.db）、汇率库（fx.db）分离，独立库便于维护
// 兼容本地与服务器两种运行环境，环境变量 GOLDOIL_DB_PATH 可覆盖数据库路径

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_DB_PATH =
  process.env.GOLDOIL_DB_PATH ?? (process.env.NODE_ENV === 'production'
    ? '/app/data/goldoil.db'
    : './data/goldoil.db');

let db: DatabaseSync | null = null;
let initError: string | null = null;

function resolveDbPath(): string {
  return process.env.GOLDOIL_DB_PATH ?? DEFAULT_DB_PATH;
}

function getDb(): DatabaseSync | null {
  if (db) return db;
  const path = resolveDbPath();
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(path);
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS goldoil_series (
        code       TEXT NOT NULL,
        trade_date TEXT NOT NULL,
        close      REAL,
        PRIMARY KEY (code, trade_date)
      );
      CREATE INDEX IF NOT EXISTS idx_goldoil_series_code_date
        ON goldoil_series (code, trade_date);
      CREATE TABLE IF NOT EXISTS goldoil_latest (
        code       TEXT PRIMARY KEY,
        close      REAL,
        prev_close REAL,
        change_pct REAL,
        trade_date TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS goldoil_fetch_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        run_at     TEXT NOT NULL DEFAULT (datetime('now')),
        code       TEXT,
        status     TEXT,
        detail     TEXT
      );
    `);
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    return null;
  }
  return db;
}

/** 返回数据库初始化错误（供 API 返回友好提示） */
export function getGoldOilDbInitError(): string | null {
  getDb();
  return initError;
}

/** 单次采集事务：清空该指标旧数据后批量写入近 3 年日线，并更新 latest */
export function upsertGoldOilSeries(
  code: string,
  rows: { trade_date: string; close: number }[],
): { inserted: number; latestTradeDate: string | null } {
  const d = getDb();
  if (!d) return { inserted: 0, latestTradeDate: null };
  try {
    d.exec('BEGIN');
    d.prepare('DELETE FROM goldoil_series WHERE code = ?').run(code);
    const ins = d.prepare(
      'INSERT OR REPLACE INTO goldoil_series (code, trade_date, close) VALUES (?, ?, ?)',
    );
    for (const r of rows) ins.run(code, r.trade_date, r.close);

    const sorted = [...rows].sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (last) {
      const changePct =
        prev && prev.close ? ((last.close - prev.close) / prev.close) * 100 : null;
      d.prepare(
        `INSERT OR REPLACE INTO goldoil_latest (code, close, prev_close, change_pct, trade_date, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      ).run(code, last.close, prev?.close ?? null, changePct, last.trade_date);
    }
    d.exec('COMMIT');
    return { inserted: rows.length, latestTradeDate: last?.trade_date ?? null };
  } catch (e) {
    try { d.exec('ROLLBACK'); } catch { /* noop */ }
    throw e;
  }
}

/** 记录采集日志 */
export function logGoldOilFetch(code: string, status: 'ok' | 'error', detail: string): void {
  const d = getDb();
  if (!d) return;
  try {
    d.prepare(
      'INSERT INTO goldoil_fetch_log (run_at, code, status, detail) VALUES (datetime(\'now\'), ?, ?, ?)',
    ).run(code, status, detail);
  } catch { /* noop */ }
}

export interface GoldOilSeriesRow {
  code: string;
  trade_date: string;
  close: number | null;
}

/** 读取全部指标近 3 年日线（按 code、trade_date 排序） */
export function getGoldOilSeriesAll(): GoldOilSeriesRow[] {
  const d = getDb();
  if (!d) return [];
  try {
    return d
      .prepare('SELECT code, trade_date, close FROM goldoil_series ORDER BY code, trade_date')
      .all() as unknown as GoldOilSeriesRow[];
  } catch {
    return [];
  }
}

export interface GoldOilLatestRow {
  code: string;
  close: number | null;
  prev_close: number | null;
  change_pct: number | null;
  trade_date: string | null;
  updated_at: string | null;
}

/** 读取全部指标最新读数 */
export function getGoldOilLatestAll(): GoldOilLatestRow[] {
  const d = getDb();
  if (!d) return [];
  try {
    return d
      .prepare(
        `SELECT code, close, prev_close, change_pct, trade_date, updated_at
         FROM goldoil_latest`,
      )
      .all() as unknown as GoldOilLatestRow[];
  } catch {
    return [];
  }
}
