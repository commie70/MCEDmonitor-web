import "server-only";
import { cstDate } from "./dates";
import { archiveEvents, monitorEvents, sortEvents, type IntelEvent } from "./events";
import { readMonitorReport, type MonitorReport } from "./monitor-report";

export interface EventsSnapshot {
  events: IntelEvent[];
  report: MonitorReport | null;
  /** 东八区今天 */
  today: string;
}

/** 全站事件的唯一读入口：监测公开事件 + 证据库里程碑，按时间倒序。 */
export async function loadEvents(): Promise<EventsSnapshot> {
  const report = await readMonitorReport();
  const events = sortEvents([...monitorEvents(report?.stories ?? []), ...archiveEvents()]);
  return { events, report, today: cstDate(new Date().toISOString()) };
}
