'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PageBackground from '@/components/PageBackground';
import type { Article } from '@/lib/articles';

function BlogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTag = searchParams.get('tag') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(data.articles);
      setAllTags(data.tags);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!currentTag) return articles;
    return articles.filter((a) => a.frontmatter.tags?.includes(currentTag));
  }, [articles, currentTag]);

  const handleTagClick = (tag: string) => {
    if (tag === currentTag) {
      router.push('/blog');
    } else {
      router.push(`/blog?tag=${encodeURIComponent(tag)}`);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[57.6rem] px-4 py-16">
        <div className="rounded-2xl bg-zinc-950/35 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10">
          <p className="text-white">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[57.6rem] px-4 py-16">
      {/* 悬浮深色内容面板：滚动时背景静止，面板浮于背景之上 */}
      <div className="rounded-2xl bg-zinc-950/35 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10">
        <h1 className="mb-8 text-xl font-bold text-white">文章</h1>

        {/* 标签筛选 */}
        {allTags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => handleTagClick('')}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                !currentTag
                  ? 'bg-white text-zinc-900'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  currentTag === tag
                    ? 'bg-white text-zinc-900'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* 文章列表 */}
        {filteredArticles.length === 0 ? (
          <p className="text-white">
            {currentTag ? `没有找到标签为「${currentTag}」的文章。` : '暂无文章。'}
          </p>
        ) : (
          <div className="space-y-10">
            {filteredArticles.map((article) => (
              <article key={article.slug} className="group">
                <Link href={`/blog/${article.slug}`}>
                  <h2 className="mb-1 text-base font-semibold text-white transition-opacity group-hover:opacity-75">
                    {article.frontmatter.title}
                  </h2>
                  <p className="mb-2 text-sm text-white">
                    {article.frontmatter.date}
                    {article.frontmatter.category && (
                      <span className="ml-3">{article.frontmatter.category}</span>
                    )}
                  </p>
                  {article.frontmatter.summary && (
                    <p className="text-sm leading-relaxed text-white">
                      {article.frontmatter.summary}
                    </p>
                  )}
                </Link>
                {article.frontmatter.tags && article.frontmatter.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {article.frontmatter.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs text-white transition-colors hover:bg-white/25"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogPage() {
  return (
    <div>
      <PageBackground />
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[57.6rem] px-4 py-16">
            <div className="rounded-2xl bg-zinc-950/35 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10">
              <p className="text-white">加载中...</p>
            </div>
          </div>
        }
      >
        <BlogContent />
      </Suspense>
    </div>
  );
}
