import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// 数据库路径：可用环境变量 FX_DB_PATH 覆盖，
// 默认放在 data 目录（与 indexes.db 同卷，Docker 持久化 ./data:/app/data）
const DB_PATH =
  process.env.FX_DB_PATH ?? path.join(process.cwd(), 'data', 'fx.db');

let initError: string | null = null;

try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  initError = `无法创建数据目录 ${path.dirname(DB_PATH)}: ${(e as Error).message}`;
}

let db: DatabaseSync | null = null;
try {
  db = new DatabaseSync(DB_PATH);

  // 迁移：旧版本 fx_series 使用 (code, month, avg) 月度均值结构，
  // 检测到即删除旧表，重建为日度结构（数据为派生数据，采集时全量重拉）
  try {
    const cols = db.prepare('PRAGMA table_info(fx_series)').all() as { name: string }[];
    if (cols.length > 0 && cols.some((c) => c.name === 'month')) {
      db.exec('DROP TABLE IF EXISTS fx_series; DROP TABLE IF EXISTS fx_latest;');
      console.warn('[fx] 检测到旧版月度均值表结构，已重建为日度结构');
    }
  } catch {
    /* 表不存在则跳过迁移 */
  }

  db.exec(`
    -- 汇率最新日度读数
    CREATE TABLE IF NOT EXISTS fx_latest (
      code TEXT PRIMARY KEY,
      close REAL,
      prev_close REAL,
      change_pct REAL,
      trade_date TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 汇率日度收盘序列（YYYY-MM-DD）
    CREATE TABLE IF NOT EXISTS fx_series (
      code TEXT NOT NULL,
      trade_date TEXT NOT NULL,
      close REAL,
      PRIMARY KEY (code, trade_date)
    );

    -- 采集日志
    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_fx_series_code_date ON fx_series(code, trade_date);
  `);
} catch (e) {
  console.error('[fx] 数据库初始化失败:', e);
  initError = `数据库打开失败 ${DB_PATH}: ${(e as Error).message}`;
}

export function getFxDbInitError(): string | null {
  return initError;
}

function assertDb(): DatabaseSync {
  if (!db) throw new Error(initError ?? '数据库未初始化');
  return db;
}

export interface FxLatestRow {
  code: string;
  close: number | null;
  prev_close: number | null;
  change_pct: number | null;
  trade_date: string | null;
  updated_at: string;
}

export interface FxSeriesRow {
  code: string;
  trade_date: string;
  close: number | null;
}

// ---------------- 写入（采集脚本用） ----------------

export function upsertFxLatest(
  code: string,
  close: number | null,
  prevClose: number | null,
  changePct: number | null,
  tradeDate: string | null
): void {
  assertDb()
    .prepare(
      `INSERT INTO fx_latest (code, close, prev_close, change_pct, trade_date, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(code) DO UPDATE SET
         close = excluded.close,
         prev_close = excluded.prev_close,
         change_pct = excluded.change_pct,
         trade_date = excluded.trade_date,
         updated_at = datetime('now')`
    )
    .run(code, close, prevClose, changePct, tradeDate);
}

export function upsertFxSeries(code: string, tradeDate: string, close: number | null): void {
  assertDb()
    .prepare(
      `INSERT INTO fx_series (code, trade_date, close)
       VALUES (?, ?, ?)
       ON CONFLICT(code, trade_date) DO UPDATE SET close = excluded.close`
    )
    .run(code, tradeDate, close);
}

export function logFxFetch(code: string, status: string, message = ''): void {
  assertDb()
    .prepare('INSERT INTO fetch_log (code, status, message) VALUES (?, ?, ?)')
    .run(code, status, message);
}

/** 清空某汇率的日度序列（数据源重拉时用） */
export function clearFxSeries(code: string): void {
  assertDb().prepare('DELETE FROM fx_series WHERE code = ?').run(code);
}

// ---------------- 读取（API 用） ----------------

/** 全部最新日度读数 */
export function getFxLatestAll(): Record<string, FxLatestRow> {
  const rows = assertDb()
    .prepare('SELECT code, close, prev_close, change_pct, trade_date, updated_at FROM fx_latest')
    .all() as unknown as FxLatestRow[];
  const map: Record<string, FxLatestRow> = {};
  for (const r of rows) map[r.code] = r;
  return map;
}

/** 某汇率日度序列（按时间正序） */
export function getFxSeries(code: string): FxSeriesRow[] {
  const rows = assertDb()
    .prepare('SELECT code, trade_date, close FROM fx_series WHERE code = ? ORDER BY trade_date ASC')
    .all(code) as unknown as FxSeriesRow[];
  return rows;
}

/** 最近一次采集时间 */
export function getFxLastFetchAt(): string | null {
  const row = assertDb()
    .prepare('SELECT MAX(fetched_at) AS t FROM fetch_log')
    .get() as unknown as { t: string | null } | undefined;
  return row?.t ?? null;
}
