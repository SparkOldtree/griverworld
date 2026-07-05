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
            <div className="mx-auto max-w-3xl px-4">
              &copy; {new Date().getFullYear()} GriverWorld. All rights reserved.
            </div>
          </footer>
          <AIChat />
        </ThemeProvider>
      </body>
    </html>
  );
}
