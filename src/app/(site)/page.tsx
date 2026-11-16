import type { Metadata } from "next";
import { Suspense } from "react";
import { EventFeed } from "@/components/feed/EventFeed";
import { AnchorPanel, HotPanel, RegulatoryPanel } from "@/components/home/Rail";
import { PageHeader } from "@/components/ui";
import { featured } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";

export const metadata: Metadata = {
  title: { absolute: "早筛情报站 — 癌症早筛产品性能、技术路线、癌种覆盖与报证进度监测" },
};

export default async function HomePage() {
  const { events, today } = await loadEvents();
  const picks = featured(events);

  return (
    <div className="grid gap-x-8 gap-y-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <PageHeader title="精选" count={picks.length} />
        <Suspense>
          <EventFeed events={picks} />
        </Suspense>
      </div>
      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-48px)] xl:self-start xl:overflow-y-auto">
        <HotPanel events={events} today={today} />
        <RegulatoryPanel />
        <AnchorPanel />
      </aside>
    </div>
  );
}
