'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV_BUTTONS = [
  { label: '资讯', href: '/news' },
  { label: '文章', href: '/blog' },
  { label: '宏观', href: '/indicators' },
  { label: '投资', href: '/invest' },
  { label: '视频', href: '/videos' },
];

export default function HomeHero() {
  const [showQR, setShowQR] = useState(false);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1
        className="text-4xl font-semibold tracking-wide text-white sm:text-5xl md:text-6xl"
        style={{ textShadow: '0 2px 16px rgba(0,0,0,0.45)' }}
      >
        GriverWorld is growing
      </h1>

      {/* 点击弹出/收起公众号二维码 */}
      <button
        type="button"
        onClick={() => setShowQR((v) => !v)}
        aria-expanded={showQR}
        className="mt-6 cursor-pointer text-sm italic text-white underline decoration-white/40 underline-offset-4 transition-opacity hover:opacity-80 sm:text-base"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
      >
        欢迎关注个人公众号：老树之见
      </button>

      <nav className="mt-14 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {NAV_BUTTONS.map((btn) => (
          <Link
            key={btn.href}
            href={btn.href}
            className="rounded-lg border border-white/30 bg-white/20 px-6 py-2.5 text-sm text-white backdrop-blur-md transition-colors hover:bg-white/35 sm:text-base"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
          >
            {btn.label}
          </Link>
        ))}
      </nav>

      {/* 公众号二维码：出现在按钮下方，3cm × 3cm，再次点击文字即消失 */}
      {showQR && (
        <img
          src="/images/wechat-qr.jpg"
          alt="公众号「老树之见」二维码"
          className="mt-10 h-[3cm] w-[3cm] rounded-lg bg-white p-1.5 shadow-2xl"
        />
      )}
    </section>
  );
}
