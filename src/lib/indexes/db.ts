// 全球股票指数日度行情数据访问层（data/indexes.db）
// 与宏观指标库（indicators.db）分离：指数为日频大表，独立库便于维护
// 兼容本地与服务器两种运行环境，环境变量 INDEXES_DB_PATH 可覆盖数据库路径

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DEFAULT_DB_PATH =
  process.env.INDEXES_DB_PATH ?? (process.env.NODE_ENV === 'production'
    ? '/app/data/indexes.db'
    : './data/indexes.db');

let db: DatabaseSync | null = null;
let initError: string | null = null;

function resolveDbPath(): string {
  return process.env.INDEXES_DB_PATH ?? DEFAULT_DB_PATH;
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
      CREATE TABLE IF NOT EXISTS index_series (
        code       TEXT NOT NULL,
        trade_date TEXT NOT NULL,
        close      REAL,
        PRIMARY KEY (code, trade_date)
      );
      CREATE INDEX IF NOT EXISTS idx_index_series_code_date
        ON index_series (code, trade_date);
      CREATE TABLE IF NOT EXISTS index_latest (
        code       TEXT PRIMARY KEY,
        close      REAL,
        prev_close REAL,
        change_pct REAL,
        trade_date TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS index_fetch_log (
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
export function getIndexDbInitError(): string | null {
  getDb();
  return initError;
}

/** 单次采集事务：清空该指数旧数据后批量写入近 3 年日线，并更新 latest */
export function upsertIndexSeries(
  code: string,
  rows: { trade_date: string; close: number }[],
  latest: { close: number; prev_close: number | null; change_pct: number | null; trade_date: string },
): { inserted: number; latestTradeDate: string | null } {
  const d = getDb();
  if (!d) return { inserted: 0, latestTradeDate: null };
  try {
    d.exec('BEGIN');
    d.prepare('DELETE FROM index_series WHERE code = ?').run(code);
    const ins = d.prepare(
      'INSERT OR REPLACE INTO index_series (code, trade_date, close) VALUES (?, ?, ?)',
    );
    for (const r of rows) ins.run(code, r.trade_date, r.close);
    d.prepare(
      `INSERT OR REPLACE INTO index_latest (code, close, prev_close, change_pct, trade_date, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      code,
      latest.close,
      latest.prev_close,
      latest.change_pct,
      latest.trade_date,
    );
    d.exec('COMMIT');
    return { inserted: rows.length, latestTradeDate: latest.trade_date };
  } catch (e) {
    try { d.exec('ROLLBACK'); } catch { /* noop */ }
    throw e;
  }
}

/** 记录采集日志 */
export function logIndexFetch(code: string, status: 'ok' | 'error', detail: string): void {
  const d = getDb();
  if (!d) return;
  try {
    d.prepare(
      'INSERT INTO index_fetch_log (run_at, code, status, detail) VALUES (datetime(\'now\'), ?, ?, ?)',
    ).run(code, status, detail);
  } catch { /* noop */ }
}

export interface IndexSeriesRow {
  code: string;
  trade_date: string;
  close: number | null;
}

/** 读取全部指数近 3 年日线（按 code、trade_date 排序） */
export function getIndexSeriesAll(): IndexSeriesRow[] {
  const d = getDb();
  if (!d) return [];
  try {
    return d
      .prepare('SELECT code, trade_date, close FROM index_series ORDER BY code, trade_date')
      .all() as unknown as IndexSeriesRow[];
  } catch {
    return [];
  }
}

export interface IndexLatestRow {
  code: string;
  close: number | null;
  prev_close: number | null;
  change_pct: number | null;
  trade_date: string | null;
  updated_at: string | null;
}

/** 读取全部指数最新读数 */
export function getIndexLatestAll(): IndexLatestRow[] {
  const d = getDb();
  if (!d) return [];
  try {
    return d
      .prepare(
        `SELECT code, close, prev_close, change_pct, trade_date, updated_at
         FROM index_latest`,
      )
      .all() as unknown as IndexLatestRow[];
  } catch {
    return [];
  }
}
