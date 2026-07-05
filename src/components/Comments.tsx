'use client';

import Giscus from '@giscus/react';
import { useTheme } from 'next-themes';

export default function Comments() {
  const { resolvedTheme } = useTheme();

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO;
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;

  if (!repo || !repoId || !categoryId) {
    return (
      <section className="rounded-lg border border-zinc-200 p-6 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          评论功能尚未配置，请设置 Giscus 环境变量：
        </p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          NEXT_PUBLIC_GISCUS_REPO / NEXT_PUBLIC_GISCUS_REPO_ID / NEXT_PUBLIC_GISCUS_CATEGORY_ID
        </p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <Giscus
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category="Announcements"
        categoryId={categoryId}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={resolvedTheme === 'dark' ? 'dark_dimmed' : 'light'}
        lang="zh-CN"
        loading="lazy"
      />
    </section>
  );
}
