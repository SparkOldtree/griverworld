import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="mb-10 text-3xl font-bold">关于</h1>

      <div className="space-y-8">
        {/* 个人介绍 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">👤 个人介绍</h2>
          <div className="prose prose-zinc max-w-none dark:prose-invert">
            <p>
              你好，我是 Griver，一名热爱技术的开发者。这里是我的个人空间，
              用来记录学习心得、技术思考和生活点滴。
            </p>
            <p>
              我热衷于前端开发、全栈架构和开源社区。平时喜欢写代码、分享视频、
              探索新技术。
            </p>
          </div>
        </section>

        {/* 技能 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">🛠 技能</h2>
          <div className="flex flex-wrap gap-2">
            {[
              'TypeScript',
              'React',
              'Next.js',
              'Node.js',
              'Tailwind CSS',
              'Python',
              'PostgreSQL',
              'Docker',
              'Git',
            ].map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* 联系方式 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">📬 联系方式</h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                GitHub：
              </span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                github.com/griver
              </a>
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                Email：
              </span>
              <a
                href="mailto:hello@griver.world"
                className="ml-1 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                hello@griver.world
              </a>
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                Bilibili：
              </span>
              <a
                href="https://space.bilibili.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                B站主页
              </a>
            </li>
            <li>
              <span className="font-medium text-zinc-900 dark:text-zinc-200">
                YouTube：
              </span>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                YouTube 频道
              </a>
            </li>
          </ul>
        </section>

        {/* 友情链接 */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">🔗 友情链接</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/blog"
                className="text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                文章列表
              </Link>
            </li>
            <li>
              <Link
                href="/videos"
                className="text-zinc-600 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                视频列表
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
