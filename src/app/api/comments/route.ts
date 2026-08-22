import { NextRequest, NextResponse } from 'next/server';
import {
  getComments,
  addComment,
  deleteComment,
  getDbInitError,
} from '@/lib/db';

// 显式使用 Node.js runtime（依赖 node:sqlite）
export const runtime = 'nodejs';

// ============================================================
// 防攻击机制（进程内内存态，重启清空，单实例部署足够）
// ============================================================

// 1) 请求频率限流：同 IP + 同内容，60 秒窗口内最多 3 条
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 3;
const rateMap = new Map<string, { count: number; windowStart: number }>();

// 2) IP 封禁：触发限流上限后封禁 24 小时
const BAN_MS = 24 * 60 * 60 * 1000;
const banMap = new Map<string, number>();

// 3) 重复内容检测：同 IP 在窗口内发过相同内容则拒绝
const recentMap = new Map<string, { content: string; at: number }>();

// 惰性清理过期数据（每次请求时顺带清理，避免定时器）
function sweepIfExpired(now: number) {
  for (const [k, v] of rateMap) {
    if (now - v.windowStart > RATE_WINDOW_MS) rateMap.delete(k);
  }
  for (const [k, t] of banMap) {
    if (now - t > BAN_MS) banMap.delete(k);
  }
  for (const [k, v] of recentMap) {
    if (now - v.at > RATE_WINDOW_MS) recentMap.delete(k);
  }
}

// 获取客户端 IP（nginx 透传 X-Forwarded-For / X-Real-IP）
function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

// 限流检查：超限返回 true（已封禁或已超限）
function isRateLimited(ip: string, slug: string, now: number): boolean {
  const bannedUntil = banMap.get(ip);
  if (bannedUntil && now < bannedUntil) return true;

  const key = `${ip}:${slug}`;
  const hit = rateMap.get(key);
  if (hit && now - hit.windowStart > RATE_WINDOW_MS) {
    // 窗口过期，重置
    rateMap.set(key, { count: 1, windowStart: now });
    return false;
  }
  const count = hit ? hit.count + 1 : 1;
  if (count > RATE_MAX) {
    // 触发限流上限 → 封禁 IP 24 小时
    banMap.set(ip, now + BAN_MS);
    return true;
  }
  rateMap.set(key, { count, windowStart: hit ? hit.windowStart : now });
  return false;
}

// 统计内容中的 URL 数量（防广告垃圾）
function countUrls(text: string): number {
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  return matches ? matches.length : 0;
}

// 基础字段校验，返回错误信息或 null
function validateInput(slug: unknown, name: unknown, content: unknown): string | null {
  if (typeof slug !== 'string' || !slug.trim() || slug.trim().length > 100) {
    return '参数无效';
  }
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n || n.length > 20) {
    return '昵称需为 1-20 个字符';
  }
  const c = typeof content === 'string' ? content.trim() : '';
  if (!c || c.length > 1000) {
    return '评论内容需为 1-1000 个字符';
  }
  if (countUrls(c) > 2) {
    return '评论中包含过多链接，请删除后重试';
  }
  return null;
}

// GET /api/comments?slug=xxx —— 获取评论列表
export function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!slug.trim() || slug.trim().length > 100) {
    return NextResponse.json({ ok: false, error: '参数无效' }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, comments: getComments(slug.trim()) });
  } catch (e) {
    // 数据库初始化失败等内部错误（含详细原因便于排查）
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/comments —— 新增评论（昵称 + 内容）
export async function POST(req: NextRequest) {
  const now = Date.now();
  sweepIfExpired(now);

  const ip = getClientIp(req);

  let body: { slug?: unknown; name?: unknown; content?: unknown; website?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '请求格式错误' }, { status: 400 });
  }

  // 蜜罐：隐藏字段被填写说明是机器人，静默放行（不写入数据）
  if (typeof body.website === 'string' && body.website.length > 0) {
    return NextResponse.json({ ok: true, comment: null });
  }

  const err = validateInput(body.slug, body.name, body.content);
  if (err) {
    return NextResponse.json({ ok: false, error: err }, { status: 400 });
  }

  const slug = (body.slug as string).trim();
  const name = (body.name as string).trim();
  const content = (body.content as string).trim();

  // IP 已封禁或超频
  if (isRateLimited(ip, slug, now)) {
    return NextResponse.json(
      { ok: false, error: '操作过于频繁，请稍后再试' },
      { status: 429 }
    );
  }

  // 重复内容检测（同 IP 窗口内相同内容）
  const recent = recentMap.get(ip);
  if (recent && now - recent.at <= RATE_WINDOW_MS && recent.content === content) {
    return NextResponse.json(
      { ok: false, error: '请勿重复提交相同内容' },
      { status: 429 }
    );
  }
  recentMap.set(ip, { content, at: now });

  let comment;
  try {
    comment = addComment(slug, name, content);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, comment }, { status: 201 });
}

// DELETE /api/comments?id=xxx —— 管理删除（需 x-admin-key 请求头）
export function DELETE(req: NextRequest) {
  const adminKey = process.env.COMMENTS_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { ok: false, error: '服务器未配置管理密钥' },
      { status: 500 }
    );
  }
  const provided = req.headers.get('x-admin-key');
  if (!provided || provided !== adminKey) {
    return NextResponse.json({ ok: false, error: '无权限' }, { status: 401 });
  }
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: '参数无效' }, { status: 400 });
  }
  const removed = deleteComment(id);
  if (!removed) {
    return NextResponse.json({ ok: false, error: '评论不存在' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
