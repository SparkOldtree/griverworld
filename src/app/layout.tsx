import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/header";
import AIChat from "@/components/AIChat";
import "./globals.css";

export const metadata: Metadata = {
  title: "GriverWorld",
  description: "个人网站 - 技术文章、视频与思考",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeProvider>
          <Header />
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <div className="mx-auto max-w-3xl space-y-2 px-4">
              <p>&copy; {new Date().getFullYear()} GriverWorld. All rights reserved.</p>

              {/* 备案信息（合规展示：文字 + 官方查询链接） */}
              <div className="flex flex-col items-center gap-1">
                <a
                  href="https://beian.miit.gov.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
                >
                  沪ICP备2026034131号-1
                </a>
                <a
                  href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=31011202023034"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 transition-colors hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
                >
                  <img
                    src="https://beian.gov.cn/img/footer.png"
                    alt="公安备案"
                    className="h-4 w-4"
                  />
                  沪公网安备31011202023034号
                </a>
              </div>
            </div>
          </footer>
          <AIChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
