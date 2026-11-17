import { redirect } from 'next/navigation';

// 「关于」tab 已改名为「基础」，旧链接 301 跳转到 /basics
export default function AboutPage() {
  redirect('/basics');
}
