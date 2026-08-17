import { SiteSidebar } from "./SiteSidebar";
import { MobileChrome } from "./MobileChrome";

/**
 * 全站骨架：桌面 225px 侧栏(原 180px 的 1.25 倍,框住分栏标题)+ 主栏；移动由 MobileChrome 接管导航。
 * 栅格与内边距取自原站 .app-shell / .app-main.
 */
export function SiteShell({ children }:{ children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-[225px_minmax(0,1fr)] max-[960px]:grid-cols-1">
      <SiteSidebar />
      <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 px-7 pb-[72px] pt-6 max-[960px]:px-[18px] max-[960px]:pb-[82px] max-[960px]:pt-0">
        <MobileChrome />
        {children}
      </main>
    </div>
  );
}
