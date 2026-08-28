import { unstable_cache } from "next/cache";

const UMAMI_URL = process.env.UMAMI_URL || "http://umami:3000";
const UMAMI_API_KEY = process.env.UMAMI_API_KEY;
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID;

interface UmamiMetricsRow {
  x: string;
  y: number;
}

async function fetchPageViews(pathname: string): Promise<number> {
  // 未配置 Umami 时静默返回 0（本地开发 / 降级）
  if (!UMAMI_API_KEY || !UMAMI_WEBSITE_ID) {
    return 0;
  }

  const url =
    `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/metrics` +
    `?type=url&startAt=0&endAt=${Date.now()}` +
    `&filters=${encodeURIComponent(JSON.stringify({ url: pathname }))}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, {
      headers: { "x-umami-api-key": UMAMI_API_KEY },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return 0;
    }

    const data = (await res.json()) as UmamiMetricsRow[];
    return data?.[0]?.y ?? 0;
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
