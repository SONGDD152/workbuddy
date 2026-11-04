export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up">
      {/* 路由切换时的顶部进度提示（CSS 动画，每次导航重挂载自动重放） */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden">
        <div className="h-full w-full origin-left animate-route-bar bg-brand" />
      </div>
      {children}
    </div>
  );
}
