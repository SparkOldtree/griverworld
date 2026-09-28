#!/usr/bin/env node
/**
 * 微信 API SSH 转发器（部署于阿里云服务器 griverworld-app 容器内执行）。
 *
 * 用途：本地宽带出口 IP 每日漂移，微信白名单按 IP 判定导致频繁 40164。
 * 本脚本从 stdin 读取 JSON 请求，在服务器侧执行 fetch（出口固定为服务器公网 IP），
 * 把响应 JSON 写到 stdout。由本地 publish-wechat.mjs 通过
 * `ssh ... docker exec -i griverworld-app node scripts/wechat-relay.mjs` 调用。
 *
 * 输入协议（stdin JSON）：
 * {
 *   "url": "https://api.weixin.qq.com/...",
 *   "method": "POST",                        // 默认 POST
 *   "headers": { "Content-Type": "..." },    // 可选
 *   "body": "字符串",                        // JSON 请求用
 *   "form": {                                // multipart 请求用（如封面素材上传）
 *     "fields": { "k": "v" },
 *     "files": [{ "name": "media", "filename": "cover.png",
 *                 "contentType": "image/png", "dataBase64": "..." }]
 *   }
 * }
 *
 * 输出协议（stdout JSON）：
 *   { "ok": true,  "status": 200, "body": <解析后的 JSON 或纯文本> }
 *   { "ok": false, "error": "..." }
 */

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', async () => {
  const respond = (obj) => process.stdout.write(JSON.stringify(obj));
  try {
    const req = JSON.parse(input);
    const { url, method = 'POST', headers = {}, body, form } = req;

    const init = { method, headers };
    if (body !== undefined) init.body = body;
    if (form) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form.fields ?? {})) fd.append(k, v);
      for (const f of form.files ?? []) {
        fd.append(
          f.name,
          new Blob([Buffer.from(f.dataBase64, 'base64')], { type: f.contentType }),
          f.filename,
        );
      }
      init.body = fd; // Content-Type（含 boundary）由 fetch 自动设置，勿手动传
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* 非 JSON 响应原样返回 */
    }
    respond({ ok: true, status: res.status, body: parsed ?? text });
  } catch (err) {
    respond({ ok: false, error: String(err?.message ?? err) });
  }
});
