import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import PageBackground from "@/components/PageBackground";
import { getAllArticles } from "@/lib/articles";
import { getAllNews } from "@/lib/news";
import { getAllVideos } from "@/lib/videos";

// 内容文件（content/news/、content/articles/）通过 docker volume 实时挂载，
// 动态渲染保证新增内容无需重建镜像即可出现在首页（与 /news 页保持一致）
export const dynamic = 'force-dynamic';

export default function Home() {
  const newsItems = getAllNews().slice(0, 3);
  const articles = getAllArticles().slice(0, 3);
  const videos = getAllVideos().slice(0, 3);

  return (
    <div>
      {/* 固定背景层：滚动时背景图静止，仅内容滚动 */}
      <PageBackground />

      {/* 第一屏：标题 + 公众号（点击弹出二维码）+ 导航按钮 */}
      <HomeHero />

      {/* 第二屏：最新资讯 / 最新文章 / 最新视频（深色半透明 + 白字，与列表页风格统一） */}
      <section className="relative bg-zinc-950/35 py-16 backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 最新资讯 */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">最新资讯</h2>
              <Link
                href="/news"
                className="text-sm text-white transition-opacity hover:opacity-75"
              >
                查看全部 &rarr;
              </Link>
            </div>
            <div className="space-y-5">
              {newsItems.length === 0 ? (
                <p className="text-sm text-white">暂无资讯，敬请期待。</p>
              ) : (
                newsItems.map((item) => (
                  <article key={item.slug} className="group">
                    <Link href={`/news/${item.slug}`}>
                      <h3 className="mb-1 text-sm font-semibold leading-snug text-white transition-opacity group-hover:opacity-75">
                        {item.frontmatter.title}
                      </h3>
                      <p className="text-xs text-white">
                        {item.frontmatter.date}
                      </p>
                    </Link>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* 最新文章 */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">最新文章</h2>
              <Link
                href="/blog"
                className="text-sm text-white transition-opacity hover:opacity-75"
              >
                查看全部 &rarr;
              </Link>
            </div>
            <div className="space-y-5">
              {articles.length === 0 ? (
                <p className="text-sm text-white">暂无文章，敬请期待。</p>
              ) : (
                articles.map((article) => (
                  <article key={article.slug} className="group">
                    <Link href={`/blog/${article.slug}`}>
                      <h3 className="mb-1 text-sm font-semibold leading-snug text-white transition-opacity group-hover:opacity-75">
                        {article.frontmatter.title}
                      </h3>
                      <p className="text-xs text-white">
                        {article.frontmatter.date}
                      </p>
                    </Link>
                  </article>
                ))
              )}
            </div>
          </div>

          {/* 最新视频 */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">最新视频</h2>
              <Link
                href="/videos"
                className="text-sm text-white transition-opacity hover:opacity-75"
              >
                查看全部 &rarr;
              </Link>
            </div>
            <div className="space-y-5">
              {videos.length === 0 ? (
                <p className="text-sm text-white">暂无视频，敬请期待。</p>
              ) : (
                videos.map((video) => (
                  <article key={video.slug} className="group">
                    <Link href={`/videos/${video.slug}`}>
                      <h3 className="mb-1 text-sm font-semibold leading-snug text-white transition-opacity group-hover:opacity-75">
                        {video.frontmatter.title}
                      </h3>
                      <p className="text-xs text-white">
                        {video.frontmatter.date}
                      </p>
                    </Link>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
