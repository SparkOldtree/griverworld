import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import { getAllNews } from '@/lib/news';

// 内容文件（content/news/）通过 docker volume 实时挂载，
// 动态渲染保证新增资讯文件无需重建镜像即可出现在列表页
export const dynamic = 'force-dynamic';

export default function NewsPage() {
  const newsItems = getAllNews();

  return (
    <div>
      <PageBackground />

      {/* 悬浮深色内容面板：滚动时背景静止，面板浮于背景之上 */}
      <div className="mx-auto w-full max-w-[57.6rem] px-4 py-16">
        <div className="rounded-2xl bg-zinc-950/35 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10">
          <h1 className="mb-8 text-xl font-bold text-white">资讯</h1>

          {newsItems.length === 0 ? (
            <p className="text-white">每日资讯放在这里</p>
          ) : (
            <div className="space-y-8">
              {newsItems.map((item) => (
                <article key={item.slug} className="group">
                  <Link href={`/news/${item.slug}`}>
                    <h2 className="mb-1 text-base font-semibold text-white transition-opacity group-hover:opacity-75">
                      {item.frontmatter.title}
                    </h2>
                    <p className="mb-2 text-sm text-white">
                      {item.frontmatter.date}
                    </p>
                    {item.frontmatter.summary && (
                      <p className="text-sm leading-relaxed text-white">
                        {item.frontmatter.summary}
                      </p>
                    )}
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
