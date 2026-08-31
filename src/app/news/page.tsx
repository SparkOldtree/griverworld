import Link from 'next/link';
import { getAllNews } from '@/lib/news';

// 内容文件（content/news/）通过 docker volume 实时挂载，
// 动态渲染保证新增资讯文件无需重建镜像即可出现在列表页
export const dynamic = 'force-dynamic';

export default function NewsPage() {
  const newsItems = getAllNews();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-xl font-bold">资讯</h1>

      {newsItems.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          每日资讯放在这里
        </p>
      ) : (
        <div className="space-y-8">
          {newsItems.map((item) => (
            <article key={item.slug} className="group">
              <Link href={`/news/${item.slug}`}>
                <h2 className="mb-1 text-base font-semibold transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
                  {item.frontmatter.title}
                </h2>
                <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {item.frontmatter.date}
                </p>
                {item.frontmatter.summary && (
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.frontmatter.summary}
                  </p>
                )}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
