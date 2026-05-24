import { demoMembers } from "@/lib/farmer-demo";
import { MemberDetail } from "./detail";

export function generateStaticParams() {
  return demoMembers.map((m) => ({ id: m.id }));
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetail id={id} />;
}
