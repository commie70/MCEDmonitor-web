import { notFound, permanentRedirect } from "next/navigation";
import { studyByLegacyIndex } from "@/data";

interface Props {
  params: Promise<{ companyId: string; studyIndex: string }>;
}

/** 旧版证据页地址(企业 + 研究下标) → 以稳定 ID 命名的研究页。 */
export default async function LegacyEvidencePage({ params }: Props) {
  const { companyId, studyIndex } = await params;
  const index = Number(studyIndex);
  const study = Number.isInteger(index) ? studyByLegacyIndex(companyId, index) : undefined;
  if (!study) notFound();
  permanentRedirect(`/studies/${study.id}`);
}
