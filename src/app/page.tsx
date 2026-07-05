import Link from "next/link";
import { getAllArticles } from "@/lib/articles";

export default function Home() {
  const articles = getAllArticles().slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      {/* 个人介绍 */}
      <section className="mb-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          你好，我是 Griver 👋
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          热爱技术、写作与分享。这里记录了我的思考、学习和创作。
          欢迎来到我的个人空间。
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            阅读文章
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            了解更多
          </Link>
        </div>
      </section>

      {/* 最新文章 */}
      <section>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold">最新文章</h2>
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
                  <h3 className="mb-1 text-lg font-semibold transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
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
    </div>
  );
}
