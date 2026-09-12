// 全站静态背景层：fixed 定位，滚动时背景图静止、仅内容滚动
export default function PageBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center"
      style={{ backgroundImage: "url(/images/background1-web.jpg)" }}
      aria-hidden
    />
  );
}
