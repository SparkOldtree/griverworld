'use client';

import { useCallback, useEffect, useState } from 'react';

interface Comment {
  id: number;
  slug: string;
  name: string;
  content: string;
  created_at: string;
}

interface CommentsProps {
  slug: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Comments({ slug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  // 蜜罐字段（人类用户不可见，机器人填了即被拦截）
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      const data = await res.json();
      if (data.ok) {
        setComments(data.comments ?? []);
      }
    } catch {
      // 加载失败静默处理
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 蜜罐触发：静默放行，不给机器人任何反馈
    if (website) {
      setContent('');
      setStatus('success');
      setMessage('感谢您的评论');
      return;
    }

    if (!name.trim()) {
      setStatus('error');
      setMessage('请填写昵称');
      return;
    }
    if (!content.trim()) {
      setStatus('error');
      setMessage('请填写评论内容');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: name.trim(),
          content: content.trim(),
          website,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setContent('');
        setStatus('success');
        setMessage('评论发布成功');
        loadComments();
      } else {
        setStatus('error');
        setMessage(data.error || '发布失败，请稍后再试');
      }
    } catch {
      setStatus('error');
      setMessage('网络异常，请稍后再试');
    }
  }

  return (
    <section className="mt-12">
      <h2 className="mb-6 text-lg font-bold">
        评论
        {comments.length > 0 && (
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({comments.length})
          </span>
        )}
      </h2>

      {/* 评论列表 */}
      {loading ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">加载中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          暂无评论，快来抢沙发吧
        </p>
      ) : (
        <ul className="space-y-6">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{comment.name}</span>
                <time
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  dateTime={comment.created_at}
                >
                  {comment.created_at}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* 评论表单 */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {/* 蜜罐：隐藏字段 */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">网站（请勿填写）</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="comment-name"
            className="mb-1.5 block text-sm font-medium"
          >
            昵称
          </label>
          <input
            id="comment-name"
            type="text"
            maxLength={20}
            placeholder="请输入昵称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
          />
        </div>

        <div>
          <label
            htmlFor="comment-content"
            className="mb-1.5 block text-sm font-medium"
          >
            评论内容
          </label>
          <textarea
            id="comment-content"
            rows={4}
            maxLength={1000}
            placeholder="写下你的想法…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-400"
          />
        </div>

        {message && (
          <p
            className={
              status === 'error'
                ? 'text-sm text-red-500 dark:text-red-400'
                : 'text-sm text-emerald-600 dark:text-emerald-400'
            }
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-md bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {status === 'loading' ? '提交中…' : '发布评论'}
        </button>
      </form>
    </section>
  );
}
