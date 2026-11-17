import { readFile } from "node:fs/promises";
import path from "node:path";
import { MobileBar } from "@/components/shell/MobileBar";
import { Sidebar, type ShellStatus } from "@/components/shell/Sidebar";
import { cstDate } from "@/lib/dates";
import { monitorHealth, readMonitorReport } from "@/lib/monitor-report";

// 报告与账本随监测运行更新；每次请求读取，保证日期窗口与监测状态不过期。
export const dynamic = "force-dynamic";

async function changelogStamp(): Promise<string> {
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "changelog.json"), "utf8");
    return String((JSON.parse(raw) as { generated_at?: string }).generated_at ?? "");
  } catch {
    return "";
  }
}

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [report, stamp] = await Promise.all([readMonitorReport(), changelogStamp()]);
  const status: ShellStatus = {
    state: monitorHealth(report).state,
    lastRun: report ? `监测至 ${cstDate(report.generated_at)}` : "",
    changelogStamp: stamp,
  };

  return (
    <div className="mx-auto flex max-w-[1720px]">
      <Sidebar status={status} />
      <div className="min-w-0 flex-1">
        <MobileBar status={status} />
        <main className="px-4 pb-[88px] pt-4 lg:px-8 lg:pb-14 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
