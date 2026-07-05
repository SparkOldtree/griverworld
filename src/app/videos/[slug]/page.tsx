import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VideoPlayer from '@/components/VideoPlayer';
import { getVideoBySlug } from '@/lib/videos';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VideoPage({ params }: PageProps) {
  const { slug } = await params;
  const video = getVideoBySlug(slug);

  if (!video) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      {/* 返回链接 */}
      <Link
        href="/videos"
        className="mb-8 inline-flex items-center text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1"
        >
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
        返回视频列表
      </Link>

      {/* 视频头信息 */}
      <header className="mb-6">
        <h1 className="mb-3 text-2xl font-bold leading-tight">
          {video.frontmatter.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <time dateTime={video.frontmatter.date}>
            {video.frontmatter.date}
          </time>
          {video.frontmatter.duration && (
            <>
              <span>·</span>
              <span>{video.frontmatter.duration}</span>
            </>
          )}
          <span>·</span>
          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
            {video.frontmatter.platform === 'bilibili' ? 'Bilibili' : 'YouTube'}
          </span>
        </div>
        {video.frontmatter.tags && video.frontmatter.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {video.frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* 视频播放器 */}
      <div className="mb-8">
        <VideoPlayer
          platform={video.frontmatter.platform}
          bvid={video.frontmatter.bvid}
          youtubeId={video.frontmatter.youtubeId}
        />
      </div>

      {/* 视频描述（Markdown 渲染） */}
      {video.content.trim() && (
        <article className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-zinc-900 prose-a:underline dark:prose-a:text-zinc-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {video.content}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}
