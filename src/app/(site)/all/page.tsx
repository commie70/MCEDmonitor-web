import type { Metadata } from "next";
import { Suspense } from "react";
import { EventFeed } from "@/components/feed/EventFeed";
import { PageHeader } from "@/components/ui";
import { COMPANIES } from "@/data";
import { loadEvents } from "@/lib/load-events";

export const metadata: Metadata = { title: "全部动态" };

export default async function AllPage() {
  const { events } = await loadEvents();
  const companies = COMPANIES.map(({ id, name, region }) => ({ id, name, region }));

  return (
    <div className="max-w-[900px]">
      <PageHeader title="全部动态" count={events.length} />
      <Suspense>
        <EventFeed events={events} companies={companies} full />
      </Suspense>
    </div>
  );
}
