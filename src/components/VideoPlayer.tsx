'use client';

import type { VideoPlatform } from '@/lib/videos';

interface VideoPlayerProps {
  platform: VideoPlatform;
  bvid?: string;
  youtubeId?: string;
  episodeId?: string;
  cover?: string;
}

export default function VideoPlayer({
  platform,
  bvid,
  youtubeId,
  episodeId,
  cover,
}: VideoPlayerProps) {
  if (platform === 'bilibili' && bvid) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        style={{ aspectRatio: '16 / 9' }}
      >
        <iframe
          src={`https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&autoplay=0`}
          className="absolute inset-0 h-full w-full"
          allowFullScreen
          title="Bilibili 视频播放器"
        />
      </div>
    );
  }

  if (platform === 'youtube' && youtubeId) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        style={{ aspectRatio: '16 / 9' }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube 视频播放器"
        />
      </div>
    );
  }

  if (platform === 'xiaoyuzhoufm') {
    // 小宇宙不支持站内嵌入播放：展示单集封面 + 收听外链
    const episodeUrl = episodeId
      ? `https://www.xiaoyuzhoufm.com/episode/${episodeId}`
      : null;
    return (
      <a
        href={episodeUrl ?? 'https://www.xiaoyuzhoufm.com/'}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        style={{ aspectRatio: '16 / 9' }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt="播客单集封面"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9" />
              <path d="M3 12v-4" />
              <path d="M12 21a9 9 0 0 1-9-9" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            小宇宙播客
          </span>
          <span className="rounded-lg bg-white/90 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-colors group-hover:bg-white">
            点击前往小宇宙收听 ↗
          </span>
        </div>
      </a>
    );
  }

  return (
    <div
      className="relative flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
      style={{ aspectRatio: '16 / 9' }}
    >
      视频信息不完整，无法播放
    </div>
  );
}
