'use client';

import type { VideoPlatform } from '@/lib/videos';

interface VideoPlayerProps {
  platform: VideoPlatform;
  bvid?: string;
  youtubeId?: string;
}

export default function VideoPlayer({
  platform,
  bvid,
  youtubeId,
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

  return (
    <div
      className="relative flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
      style={{ aspectRatio: '16 / 9' }}
    >
      视频信息不完整，无法播放
    </div>
  );
}
