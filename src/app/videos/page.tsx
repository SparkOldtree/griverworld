import Link from 'next/link';
import { getAllVideos } from '@/lib/videos';

export default function VideosPage() {
  const videos = getAllVideos();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-xl font-bold">视频</h1>

      {videos.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">暂无视频。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {videos.map((video) => (
            <Link
              key={video.slug}
              href={`/videos/${video.slug}`}
              className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              {/* 封面 */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {video.frontmatter.cover ? (
                  <img
                    src={video.frontmatter.cover}
                    alt={video.frontmatter.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                )}
                {/* 平台标签 */}
                <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
                  {video.frontmatter.platform === 'bilibili'
                    ? 'B站'
                    : 'YouTube'}
                </span>
                {/* 时长 */}
                {video.frontmatter.duration && (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white">
                    {video.frontmatter.duration}
                  </span>
                )}
              </div>

              {/* 信息 */}
              <div className="p-4">
                <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
                  {video.frontmatter.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {video.frontmatter.date}
                </p>
                {video.frontmatter.summary && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {video.frontmatter.summary}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
