import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { PageHeader } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/url";

export const metadata: Metadata = { title: "反馈" };

export default function FeedbackPage() {
  return (
    <div className="max-w-[640px]">
      <PageHeader title="反馈" />
      <FeedbackForm to={CONTACT_EMAIL} />
    </div>
  );
}
