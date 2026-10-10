#!/usr/bin/env node
// 校验 content/news/*.md 的 frontmatter 是否可被 gray-matter 正常解析。
// 用法：node scripts/check-news-frontmatter.mjs
// 退出码：0 = 全部正常；1 = 存在无法解析或缺少 date/title 的文件。
//
// 背景：summary/title 用 ASCII 双引号包裹时，正文里再出现 ASCII 双引号会把 YAML
// 字符串提前截断，gray-matter 解析失败 → frontmatter.date 丢失 → 该条资讯在
// /news 列表里被排到最末尾且标题/日期空白，也进不了首页「最新资讯」。详见
// .codebuddy/automations/automation/memory.md「通用经验」。

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const dir = path.join(process.cwd(), 'content', 'news');

if (!fs.existsSync(dir)) {
  console.error(`目录不存在：${dir}`);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
const bad = [];

for (const f of files) {
  const full = path.join(dir, f);
  try {
    const { data } = matter(fs.readFileSync(full, 'utf8'));
    if (!data || !data.date || !data.title) {
      bad.push(`${f} → frontmatter 解析结果为空，缺少 date/title（多为引号未转义）`);
    }
  } catch (e) {
    bad.push(`${f} → YAML 解析失败：${String(e.message).split('\n')[0]}`);
  }
}

if (bad.length === 0) {
  console.log(`OK：${files.length} 个资讯文件 frontmatter 全部正常`);
  process.exit(0);
}

console.error(`发现 ${bad.length} 个异常文件：`);
for (const b of bad) console.error('  ✗ ' + b);
console.error('\n修复建议：把 frontmatter 内的 ASCII 双引号 " 改成中文引号 “ ” 或 「 」。');
process.exit(1);
