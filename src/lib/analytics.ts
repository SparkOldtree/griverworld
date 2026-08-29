import { unstable_cache } from "next/cache";

const UMAMI_URL = process.env.UMAMI_URL || "http://umami:3000";
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || "admin";
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

// 内存缓存登录 token（Umami v3 自托管版以 Bearer token 鉴权）
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  if (!UMAMI_PASSWORD || !UMAMI_WEBSITE_ID) {
    return null;
  }

  // 复用未过期的 token（保守取 24h 有效期，过期自动重新登录）
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { token: string };
    cachedToken = { token: data.token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    return data.token;
  } catch {
    return null;
  }
}

interface BreakdownRow {
  path: string;
  views: number;
}

async function fetchPageViews(pathname: string): Promise<number> {
  // 未配置 Umami 时静默返回 0（本地开发 / 降级）
  const token = await getToken();
  if (!token) {
    return 0;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${UMAMI_URL}/api/reports/breakdown`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "breakdown",
        websiteId: UMAMI_WEBSITE_ID,
        filters: { url: pathname },
        parameters: {
          startDate: "1970-01-01T00:00:00.000Z",
          endDate: "2999-12-31T23:59:59.999Z",
          fields: ["path"],
          dimension: "path",
        },
        limit: 1,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return 0;
    }

    const data = (await res.json()) as BreakdownRow[];
    return data?.[0]?.views ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 获取指定路径的页面浏览量（服务端调用，60s 缓存）
 */
export const getPageViews = (pathname: string) =>
  unstable_cache(
    () => fetchPageViews(pathname),
    ["umami-page-views", pathname],
    { revalidate: 60 },
  )();
