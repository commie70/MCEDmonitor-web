import type { Metadata } from "next";
import { NotFoundView } from "@/components/NotFoundView";

export const metadata: Metadata = { title: "页面不存在" };

export default function NotFound() {
  return <NotFoundView />;
}
