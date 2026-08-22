import Link from 'next/link';
import { getAllVideos } from '@/lib/videos';

function formatDuration(duration?: string) {
  if (!duration) return null;
  // 若已为 h:mm:ss 或 m:ss 格式则直接展示
  if (/^\d+:\d{2}(:\d{2})?$/.test(duration)) return duration;
  const total = Number(duration);
  if (!Number.isFinite(total) || total <= 0) return duration;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideosPage() {
  const videos = getAllVideos();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="mb-3 text-xl font-bold">视频</h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        精选科技与商业视频，点击卡片即可观看。
      </p>

      {videos.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">暂无视频</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {videos.map((video) => {
            const { frontmatter } = video;
            return (
              <Link
                key={video.slug}
                href={`/videos/${video.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                {/* 封面 */}
                <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {frontmatter.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frontmatter.cover}
                      alt={frontmatter.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 text-sm text-zinc-500 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400">
                      暂无封面
                    </div>
                  )}
                  {frontmatter.duration && (
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
                      {formatDuration(frontmatter.duration)}
                    </span>
                  )}
                  {frontmatter.platform === 'bilibili' && (
                    <span className="absolute left-2 top-2 rounded-md bg-pink-500/90 px-1.5 py-0.5 text-xs font-medium text-white">
                      Bilibili
                    </span>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                    {frontmatter.title}
                  </h2>
                  <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <time dateTime={frontmatter.date}>{frontmatter.date}</time>
                  </div>
                  {frontmatter.summary && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {frontmatter.summary}
                    </p>
                  )}
                  {frontmatter.tags && frontmatter.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {frontmatter.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
