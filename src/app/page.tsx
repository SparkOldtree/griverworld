import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { getAllNews } from "@/lib/news";

// 内容文件（content/news/、content/articles/）通过 docker volume 实时挂载，
// 动态渲染保证新增内容无需重建镜像即可出现在首页（与 /news 页保持一致）
export const dynamic = 'force-dynamic';

export default function Home() {
  const newsItems = getAllNews().slice(0, 3);
  const articles = getAllArticles().slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      {/* 最新资讯 */}
      <section className="mb-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">最新资讯</h2>
          {newsItems.length > 0 && (
            <Link
              href="/news"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              查看全部 &rarr;
            </Link>
          )}
        </div>

        {newsItems.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            暂无资讯，敬请期待。
          </p>
        ) : (
          <div className="space-y-8">
            {newsItems.map((item) => (
              <article key={item.slug} className="group">
                <Link href={`/news/${item.slug}`}>
                  <h3 className="mb-1 text-base font-semibold transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
                    {item.frontmatter.title}
                  </h3>
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
      </section>

      {/* 最新文章 */}
      <section className="mb-16">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">最新文章</h2>
          {articles.length > 0 && (
            <Link
              href="/blog"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              查看全部 &rarr;
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400">
            暂无文章，敬请期待。
          </p>
        ) : (
          <div className="space-y-8">
            {articles.map((article) => (
              <article key={article.slug} className="group">
                <Link href={`/blog/${article.slug}`}>
                  <h3 className="mb-1 text-base font-semibold transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
                    {article.frontmatter.title}
                  </h3>
                  <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {article.frontmatter.date}
                    {article.frontmatter.category && (
                      <span className="ml-3">
                        {article.frontmatter.category}
                      </span>
                    )}
                  </p>
                  {article.frontmatter.summary && (
                    <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {article.frontmatter.summary}
                    </p>
                  )}
                </Link>
                {article.frontmatter.tags && article.frontmatter.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {article.frontmatter.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${encodeURIComponent(tag)}`}
                        className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 关注公众号 */}
      <p className="mt-16 text-center text-blue-900 italic">
        欢迎关注个人公众号：老树之见
      </p>
    </div>
  );
}
