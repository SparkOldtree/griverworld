import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// 数据库路径：可用环境变量 INDICATORS_DB_PATH 覆盖，
// 默认放在 data 目录（与 comments.db 同卷，Docker 持久化 ./data:/app/data）
const DB_PATH =
  process.env.INDICATORS_DB_PATH ??
  path.join(process.cwd(), 'data', 'indicators.db');

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
    -- 指标最新读数（热力图用）
    CREATE TABLE IF NOT EXISTS indicator_latest (
      code TEXT PRIMARY KEY,
      value REAL,
      prev_value REAL,
      report_date TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 指标历史序列（对比折线图用）
    CREATE TABLE IF NOT EXISTS indicator_series (
      code TEXT NOT NULL,
      report_date TEXT NOT NULL,
      value REAL,
      PRIMARY KEY (code, report_date)
    );

    -- 采集日志
    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_series_code_date ON indicator_series(code, report_date);
  `);
} catch (e) {
  console.error('[indicators] 数据库初始化失败:', e);
  initError = `数据库打开失败 ${DB_PATH}: ${(e as Error).message}`;
}

export function getIndicatorsDbInitError(): string | null {
  return initError;
}

function assertDb(): DatabaseSync {
  if (!db) throw new Error(initError ?? '数据库未初始化');
  return db;
}

export interface LatestRow {
  code: string;
  value: number | null;
  prev_value: number | null;
  report_date: string | null;
  updated_at: string;
}

export interface SeriesRow {
  code: string;
  report_date: string;
  value: number | null;
}

// ---------------- 写入（采集脚本用） ----------------

export function upsertLatest(
  code: string,
  value: number | null,
  prevValue: number | null,
  reportDate: string | null
): void {
  assertDb()
    .prepare(
      `INSERT INTO indicator_latest (code, value, prev_value, report_date, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(code) DO UPDATE SET
         value = excluded.value,
         prev_value = excluded.prev_value,
         report_date = excluded.report_date,
         updated_at = datetime('now')`
    )
    .run(code, value, prevValue, reportDate);
}

export function upsertSeries(code: string, reportDate: string, value: number | null): void {
  assertDb()
    .prepare(
      `INSERT INTO indicator_series (code, report_date, value)
       VALUES (?, ?, ?)
       ON CONFLICT(code, report_date) DO UPDATE SET value = excluded.value`
    )
    .run(code, reportDate, value);
}

export function logFetch(code: string, status: string, message = ''): void {
  assertDb()
    .prepare('INSERT INTO fetch_log (code, status, message) VALUES (?, ?, ?)')
    .run(code, status, message);
}

/** 清空某指标的历史序列（数据源重拉时用） */
export function clearSeries(code: string): void {
  assertDb().prepare('DELETE FROM indicator_series WHERE code = ?').run(code);
}

// ---------------- 读取（API 用） ----------------

/** 全部最新读数（含上期值），用于热力图 */
export function getLatestAll(): Record<string, LatestRow> {
  const rows = assertDb()
    .prepare('SELECT code, value, prev_value, report_date, updated_at FROM indicator_latest')
    .all() as unknown as LatestRow[];
  const map: Record<string, LatestRow> = {};
  for (const r of rows) map[r.code] = r;
  return map;
}

/** 某指标历史序列（取最近 limit 期，按时间正序），用于对比折线图 */
export function getSeries(code: string, limit = 60): SeriesRow[] {
  const rows = assertDb()
    .prepare(
      'SELECT code, report_date, value FROM indicator_series WHERE code = ? ORDER BY report_date DESC LIMIT ?'
    )
    .all(code, limit) as unknown as SeriesRow[];
  return rows.reverse();
}

/** 最近一次采集时间 */
export function getLastFetchAt(): string | null {
  const row = assertDb()
    .prepare('SELECT MAX(fetched_at) AS t FROM fetch_log')
    .get() as unknown as { t: string | null } | undefined;
  return row?.t ?? null;
}
