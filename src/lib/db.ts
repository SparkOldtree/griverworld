import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// 数据库路径：可用环境变量 COMMENTS_DB_PATH 覆盖，
// 默认放在 data 目录（对应 Docker 持久化卷 ./data:/app/data）
const DB_PATH =
  process.env.COMMENTS_DB_PATH ??
  path.join(process.cwd(), 'data', 'comments.db');

// 数据库初始化失败时的错误详情（供 API 排查返回，成功则为 null）
let initError: string | null = null;

// 确保目录存在
try {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
} catch (e) {
  initError = `无法创建数据目录 ${path.dirname(DB_PATH)}: ${(e as Error).message}`;
}

// 单例连接（Next.js 路由模块复用）
let db: DatabaseSync | null = null;
try {
  db = new DatabaseSync(DB_PATH);
  // 初始化表结构与索引
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug);
  `);
} catch (e) {
  console.error('[comments] 数据库初始化失败:', e);
  initError = `数据库打开失败 ${DB_PATH}: ${(e as Error).message}`;
}

// 返回初始化错误（供诊断）
export function getDbInitError(): string | null {
  return initError;
}

// 确保数据库可用，否则抛出初始化错误
function assertDb(): DatabaseSync {
  if (!db) {
    throw new Error(initError ?? '数据库未初始化');
  }
  return db;
}

export interface Comment {
  id: number;
  slug: string;
  name: string;
  content: string;
  created_at: string;
}

// 获取某内容的全部评论（按时间正序）
export function getComments(slug: string): Comment[] {
  const stmt = assertDb().prepare(
    'SELECT id, slug, name, content, created_at FROM comments WHERE slug = ? ORDER BY created_at ASC, id ASC'
  );
  return stmt.all(slug) as unknown as Comment[];
}

// 新增评论，返回完整记录
export function addComment(
  slug: string,
  name: string,
  content: string
): Comment {
  const statement = assertDb().prepare(
    'INSERT INTO comments (slug, name, content) VALUES (?, ?, ?)'
  );
  const result = statement.run(slug, name, content);
  const id = Number(result.lastInsertRowid);
  const row = assertDb()
    .prepare(
      'SELECT id, slug, name, content, created_at FROM comments WHERE id = ?'
    )
    .get(id) as unknown as Comment;
  return row;
}

// 删除评论（管理用），返回是否删除成功
export function deleteComment(id: number): boolean {
  const result = assertDb().prepare('DELETE FROM comments WHERE id = ?').run(id);
  return Number(result.changes) > 0;
}
