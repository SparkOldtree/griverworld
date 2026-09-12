#!/usr/bin/env node
/**
 * 把当日 AI 资讯推进微信公众号草稿箱。
 *
 * 用法：
 *   node .codebuddy/scripts/publish-wechat.mjs 2026-09-12
 *   node .codebuddy/scripts/publish-wechat.mjs 2026-09-12 --force      # 删掉当天旧草稿重推
 *   node .codebuddy/scripts/publish-wechat.mjs 2026-09-12 --dry-run    # 只生成微信版文件，不推送
 *
 * ── 输入契约 ──────────────────────────────────────────────
 * 1. content/news/daily-news-<date>.md        必需。正文来源（网站版，本脚本只读不改）
 * 2. .codebuddy/wechat/briefs/<date>.md       可选。公众号版简报，格式：
 *
 *      ---
 *      title: "9月12日 AI资讯｜菲尔兹联名，GPT-6再破防线"
 *      digest: "菲尔兹联名，GPT-6破数学防线，6TB黑市曝光"
 *      ---
 *
 *      （这里写导语 markdown，脚本会自动补分隔线后接正文）
 *
 *    简报缺失时降级：标题取源文件 frontmatter，摘要按 100 字截取，无导语。
 *    标题/摘要也可用 --title / --digest 临时覆盖。
 *
 * ── 为什么简报要单独一层 ──────────────────────────────────
 * 网站版的 summary 是 100+ 字长摘要，而微信摘要上限约 120 字符、分享卡片只显示前几十字，
 * 两边需求不同，硬用一份会互相迁就。导语同理：网站靠页面排版撑开场，公众号只能靠正文自己。
 *
 * ── 为什么不用 `wenyan publish` ───────────────────────────
 * wenyan 只做「渲染」这一件事（主题 pie），API 调用全部由本脚本完成，原因有三：
 * a. wenyan 的类型定义里没有 digest 字段，用它推送摘要必然退化成"微信自动抓正文前 54 字"；
 * b. wenyan 会把 access_token 缓存到自己的凭据库里，而微信只认最新一个 token，
 *    脚本再调一次 cgi-bin/token 就会把它的缓存顶掉，表现为 40001 invalid credential；
 * c. 本脚本改用 stable_token，且自己管判重与回滚，行为完全确定。
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

// ---------- 路径与常量 ----------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ENV_FILE = path.join(os.homedir(), '.config/griverworld/wechat.env');
const STATE_FILE = path.join(ROOT, '.codebuddy/automations/automation/wechat-drafts.json');
const BRIEF_DIR = path.join(ROOT, '.codebuddy/wechat/briefs');
const DRAFT_DIR = path.join(ROOT, '.codebuddy/wechat/drafts');
const COVER = path.join(ROOT, 'public/images/daily-news-cover.png');
const WENYAN = path.join(os.homedir(), '.local/bin/wenyan');
const API = 'https://api.weixin.qq.com/cgi-bin';

const THEME = 'pie';
const HIGHLIGHT = 'solarized-light';
const DIGEST_MAX = 100; // 微信摘要上限约 120 字符，留余量
const TITLE_MAX = 64;   // 微信标题上限 64 字符，超了报 45003

const fmValueOf = (text, key) =>
  (text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, 'm'))?.[1] ?? '').replace(/"/g, '').trim();

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const date = argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const force = argv.includes('--force');
const dryRun = argv.includes('--dry-run');
const optOf = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};

if (!date) {
  die('用法: publish-wechat.mjs <YYYY-MM-DD> [--title "..."] [--digest "..."] [--force] [--dry-run]');
}

// ---------- 源文件 ----------
const srcPath = path.join(ROOT, 'content/news', `daily-news-${date}.md`);
if (!existsSync(srcPath)) die(`❌ 未找到源文件: ${srcPath}`);
const raw = readFileSync(srcPath, 'utf8');
const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) die('❌ 源文件缺少 YAML frontmatter');
const srcFm = fm[1];

// ---------- 简报（可选） ----------
const briefPath = path.join(BRIEF_DIR, `${date}.md`);
let briefFm = '';
let briefBody = '';
if (existsSync(briefPath)) {
  const br = readFileSync(briefPath, 'utf8');
  const bm = br.match(/^---\n([\s\S]*?)\n---\n/);
  briefFm = bm ? bm[1] : '';
  briefBody = (bm ? br.slice(bm[0].length) : br).trim();
} else {
  console.warn(`⚠️  没找到简报 ${briefPath}，降级为无导语版本`);
}

// ---------- 标题 / 摘要 ----------
const title = (optOf('--title') || fmValueOf(briefFm, 'title') || fmValueOf(srcFm, 'title')).slice(0, TITLE_MAX);

const digest = (() => {
  const explicit = optOf('--digest') || fmValueOf(briefFm, 'digest');
  if (explicit) return explicit.slice(0, DIGEST_MAX);

  const summary = fmValueOf(srcFm, 'summary');
  if (!summary) return '';
  if (summary.length <= DIGEST_MAX) return summary;

  // 尽量停在句读处，避免出现"AI公司把数学难题当公"这种断句
  const head = summary.slice(0, DIGEST_MAX);
  const cut = Math.max(head.lastIndexOf('；'), head.lastIndexOf('。'), head.lastIndexOf('，'));
  return cut > DIGEST_MAX * 0.5 ? head.slice(0, cut) : head;
})();

if (!title) die('❌ 标题为空（源文件 frontmatter 没有 title，也没传 --title）');
if (title.length >= TITLE_MAX) console.warn(`⚠️  标题达 ${TITLE_MAX} 字符上限，可能被截断`);
if (!digest) console.warn('⚠️  摘要为空，微信会退回"自动抓取正文前 54 字"');

// ---------- 生成微信版 md ----------
// 去掉正文开头的 H1 —— 它和 title 重复，微信正文里再顶一遍很难看
const mainBody = raw.slice(fm[0].length).replace(/^\s*#\s+.*\n+/, '').trim();
const composed = briefBody ? `${briefBody}\n\n---\n\n${mainBody}` : mainBody;

mkdirSync(DRAFT_DIR, { recursive: true });
const draftPath = path.join(DRAFT_DIR, `daily-news-${date}.md`);
writeFileSync(draftPath, `${composed}\n`, 'utf8');

console.log(`📝 微信版: ${draftPath}`);
console.log(`   标题: ${title}`);
console.log(`   摘要: ${digest}`);
console.log(`   导语: ${briefBody ? '有' : '无'}`);

if (dryRun) {
  console.log('🔍 --dry-run，跳过推送。核对无误后去掉该参数重跑。');
  process.exit(0);
}

// ---------- 状态文件 ----------
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};
const saveState = () => {
  mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
};

if (state[date] && !force) {
  console.log(`⏭️  ${date} 已推送过（media_id=${state[date].media_id}），跳过。需重推加 --force。`);
  process.exit(0);
}

// ---------- 凭据 ----------
if (!existsSync(ENV_FILE)) die(`❌ 找不到凭据文件: ${ENV_FILE}`);
const env = {};
for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const i = line.indexOf('=');
  if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
if (!env.WECHAT_APP_ID || !env.WECHAT_APP_SECRET) {
  die('❌ 凭据文件缺少 WECHAT_APP_ID 或 WECHAT_APP_SECRET');
}

// ---------- 渲染（wenyan 只负责这一步） ----------
console.log('🎨 渲染排版…');
let rendered;
try {
  rendered = execFileSync(WENYAN, ['render', '-f', draftPath, '-t', THEME, '-h', HIGHLIGHT], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  die(`❌ 渲染失败: ${String(err.stderr ?? err.message).trim()}`);
}
const html = rendered.slice(rendered.indexOf('<section'));
if (!html.startsWith('<section')) die('❌ 渲染结果异常，未找到 <section> 根节点');

// ---------- 稳定版 access_token ----------
// 用 stable_token 而不是 cgi-bin/token：前者不会被其他调用顶掉，也不占用普通 token 的每日额度
async function api(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) throw new Error(`${data.errcode}: ${data.errmsg}`);
  return data;
}

const tok = await api(`${API}/stable_token`, {
  grant_type: 'client_credential',
  appid: env.WECHAT_APP_ID,
  secret: env.WECHAT_APP_SECRET,
  force_refresh: false,
});
if (!tok.access_token) {
  console.error(`❌ 获取 access_token 失败: ${tok.errcode} ${tok.errmsg}`);
  console.error('   40013 = AppID 不对；40125 = AppSecret 不对（微信开发者平台 → 我的业务 → 开发密钥）');
  process.exit(1);
}
const token = tok.access_token;

// ---------- 封面素材（按文件内容缓存，避免每天重复占用素材库额度） ----------
async function ensureCover() {
  if (!existsSync(COVER)) die(`❌ 找不到封面图: ${COVER}`);
  const buf = readFileSync(COVER);
  const hash = createHash('md5').update(buf).digest('hex');

  if (state._cover?.hash === hash) {
    console.log(`🖼️  封面复用已上传素材 ${state._cover.media_id}`);
    return state._cover.media_id;
  }

  const form = new FormData();
  form.append('media', new Blob([buf], { type: 'image/png' }), path.basename(COVER));
  const res = await fetch(`${API}/material/add_material?access_token=${token}&type=image`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.media_id) throw new Error(`封面素材上传失败: ${data.errcode} ${data.errmsg}`);

  state._cover = { hash, media_id: data.media_id, uploadedAt: new Date().toISOString() };
  console.log(`🖼️  封面已上传: ${data.media_id}`);
  return data.media_id;
}

// ---------- --force：先删旧草稿，否则草稿箱会堆两条 ----------
if (force && state[date]?.media_id) {
  try {
    await api(`${API}/draft/delete?access_token=${token}`, { media_id: state[date].media_id });
    console.log(`🗑️  已删除旧草稿 ${state[date].media_id}`);
  } catch (err) {
    console.warn(`⚠️  删除旧草稿失败（继续）: ${err.message}`);
  }
}

// ---------- 新建草稿 ----------
let thumbMediaId;
try {
  thumbMediaId = await ensureCover();
} catch (err) {
  die(`❌ ${err.message}`);
}

let added;
try {
  added = await api(`${API}/draft/add?access_token=${token}`, {
    articles: [
      {
        title,
        author: '',
        digest,
        content: html,
        content_source_url: '',
        thumb_media_id: thumbMediaId,
        need_open_comment: 0,
        only_fans_can_comment: 0,
      },
    ],
  });
} catch (err) {
  console.error(`❌ 创建草稿失败: ${err.message}`);
  console.error('   常见错误码： 40164=IP不在白名单  48001=接口无权限');
  console.error('                45004=摘要超限  45003=标题超限  45166=内容超长');
  process.exit(1);
}

// ---------- 状态落盘 ----------
state[date] = { media_id: added.media_id, title, digest, pushedAt: new Date().toISOString() };
saveState();

console.log(`\n🎉 已进草稿箱: ${date}`);
console.log(`   media_id: ${added.media_id}`);
console.log('📱 后台换封面/预览/群发: https://mp.weixin.qq.com/');
