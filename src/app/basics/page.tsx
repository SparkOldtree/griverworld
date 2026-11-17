import type { Metadata } from 'next';
import PageBackground from '@/components/PageBackground';

export const metadata: Metadata = {
  title: '基础',
  description: '体系化的行业研报与知识资料，卡片内直接阅读。',
};

/** 资料卡片定义：后续新研报在此数组向下追加即可 */
const REPORT_CARDS = [
  {
    file: '/reports/llm-industry-report-v2.html',
    title: '大模型从开发到应用 · 产业链全景研报',
    meta: '2026-11 · 8 层产业链 · 6 大章节',
  },
] as const;

export default function BasicsPage() {
  return (
    <div>
      <PageBackground />

      {/* 悬浮深色内容面板：PC 端宽度在原 max-w-3xl 基础上增加 50%（max-w-6xl） */}
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="rounded-2xl bg-zinc-950/35 px-6 py-8 shadow-xl backdrop-blur-sm sm:px-10 sm:py-10">
          <h1 className="mb-1 text-xl font-bold text-white">基础</h1>
          <p className="mb-8 text-sm text-zinc-200">
            体系化的行业研报与知识资料，卡片内直接阅读。
          </p>

          <div className="flex flex-col gap-8">
            {REPORT_CARDS.map((card) => (
              <div
                key={card.file}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* 卡片顶栏：标题 + 元信息 + 全屏打开 */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 dark:border-zinc-800">
                  <div className="min-w-0 text-sm">
                    <span className="font-bold">{card.title}</span>
                    <span className="ml-2 text-xs font-normal text-zinc-400">
                      {card.meta}
                    </span>
                  </div>
                  <a
                    href={card.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md border border-zinc-600 px-2.5 py-1 text-xs text-sky-400 transition-colors hover:border-sky-500 hover:text-sky-300"
                  >
                    全屏打开 ↗
                  </a>
                </div>
                {/* 内嵌滚动阅读区 */}
                <iframe
                  src={card.file}
                  title={card.title}
                  className="block h-[78vh] w-full border-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
