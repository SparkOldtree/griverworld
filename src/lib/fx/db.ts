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
  db.exec(`
    -- 汇率最新月度读数
    CREATE TABLE IF NOT EXISTS fx_latest (
      code TEXT PRIMARY KEY,
      avg REAL,
      prev_avg REAL,
      change_pct REAL,
      month TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 汇率月度均值序列（YYYY-MM）
    CREATE TABLE IF NOT EXISTS fx_series (
      code TEXT NOT NULL,
      month TEXT NOT NULL,
      avg REAL,
      PRIMARY KEY (code, month)
    );

    -- 采集日志
    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_fx_series_code_month ON fx_series(code, month);
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
  avg: number | null;
  prev_avg: number | null;
  change_pct: number | null;
  month: string | null;
  updated_at: string;
}

export interface FxSeriesRow {
  code: string;
  month: string;
  avg: number | null;
}

// ---------------- 写入（采集脚本用） ----------------

export function upsertFxLatest(
  code: string,
  avg: number | null,
  prevAvg: number | null,
  changePct: number | null,
  month: string | null
): void {
  assertDb()
    .prepare(
      `INSERT INTO fx_latest (code, avg, prev_avg, change_pct, month, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(code) DO UPDATE SET
         avg = excluded.avg,
         prev_avg = excluded.prev_avg,
         change_pct = excluded.change_pct,
         month = excluded.month,
         updated_at = datetime('now')`
    )
    .run(code, avg, prevAvg, changePct, month);
}

export function upsertFxSeries(code: string, month: string, avg: number | null): void {
  assertDb()
    .prepare(
      `INSERT INTO fx_series (code, month, avg)
       VALUES (?, ?, ?)
       ON CONFLICT(code, month) DO UPDATE SET avg = excluded.avg`
    )
    .run(code, month, avg);
}

export function logFxFetch(code: string, status: string, message = ''): void {
  assertDb()
    .prepare('INSERT INTO fetch_log (code, status, message) VALUES (?, ?, ?)')
    .run(code, status, message);
}

/** 清空某汇率的历史序列（数据源重拉时用） */
export function clearFxSeries(code: string): void {
  assertDb().prepare('DELETE FROM fx_series WHERE code = ?').run(code);
}

// ---------------- 读取（API 用） ----------------

/** 全部最新月度读数 */
export function getFxLatestAll(): Record<string, FxLatestRow> {
  const rows = assertDb()
    .prepare('SELECT code, avg, prev_avg, change_pct, month, updated_at FROM fx_latest')
    .all() as unknown as FxLatestRow[];
  const map: Record<string, FxLatestRow> = {};
  for (const r of rows) map[r.code] = r;
  return map;
}

/** 某汇率月度序列（按时间正序） */
export function getFxSeries(code: string): FxSeriesRow[] {
  const rows = assertDb()
    .prepare('SELECT code, month, avg FROM fx_series WHERE code = ? ORDER BY month ASC')
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
