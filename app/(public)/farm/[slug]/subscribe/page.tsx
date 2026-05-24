import { sampleFarms } from "@/lib/sample-farms";
import { notFound } from "next/navigation";
import { SubscribeWizard } from "./wizard";

export function generateStaticParams() {
  return sampleFarms.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const farm = sampleFarms.find((f) => f.slug === slug);
  return {
    title: farm ? `Subscribe to ${farm.name}` : "Subscribe",
    description: farm?.tagline,
  };
}

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const farm = sampleFarms.find((f) => f.slug === slug);
  if (!farm) notFound();
  return <SubscribeWizard farm={farm} />;
}
