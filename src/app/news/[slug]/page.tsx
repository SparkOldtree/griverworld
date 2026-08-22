import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Comments from '@/components/Comments';
import { getNewsBySlug } from '@/lib/news';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const newsItem = getNewsBySlug(slug);

  if (!newsItem) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      {/* 返回链接 */}
      <Link
        href="/news"
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
        返回资讯列表
      </Link>

      {/* 资讯头 */}
      <header className="mb-10">
        <h1 className="mb-4 text-xl font-bold leading-tight">
          {newsItem.frontmatter.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <time dateTime={newsItem.frontmatter.date}>
            {newsItem.frontmatter.date}
          </time>
          {newsItem.frontmatter.tags && newsItem.frontmatter.tags.length > 0 && (
            <span className="flex flex-wrap gap-2">
              {newsItem.frontmatter.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
      </header>

      {/* 资讯内容 */}
      <article className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-zinc-900 prose-a:underline prose-a:decoration-zinc-400 hover:prose-a:decoration-zinc-600 prose-img:rounded-lg dark:prose-a:text-zinc-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {newsItem.content}
        </ReactMarkdown>
      </article>

      {/* 评论 */}
      <hr className="my-12 border-zinc-200 dark:border-zinc-800" />
      <Comments slug={newsItem.slug} />
    </div>
  );
}
