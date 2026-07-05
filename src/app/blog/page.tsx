'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <p className="text-zinc-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="mb-8 text-3xl font-bold">文章</h1>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => handleTagClick('')}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              !currentTag
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
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
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* 文章列表 */}
      {filteredArticles.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          {currentTag ? `没有找到标签为「${currentTag}」的文章。` : '暂无文章。'}
        </p>
      ) : (
        <div className="space-y-10">
          {filteredArticles.map((article) => (
            <article key={article.slug} className="group">
              <Link href={`/blog/${article.slug}`}>
                <h2 className="mb-1 text-xl font-semibold transition-colors group-hover:text-zinc-500 dark:group-hover:text-zinc-400">
                  {article.frontmatter.title}
                </h2>
                <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {article.frontmatter.date}
                  {article.frontmatter.category && (
                    <span className="ml-3">{article.frontmatter.category}</span>
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
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
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
  );
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-16">
          <p className="text-zinc-500">加载中...</p>
        </div>
      }
    >
      <BlogContent />
    </Suspense>
  );
}
