import type { Metadata } from "next";
import { StarredList } from "@/components/feed/StarredList";

export const metadata: Metadata = { title: "收藏" };

export default function StarredPage() {
  return <StarredList />;
}
