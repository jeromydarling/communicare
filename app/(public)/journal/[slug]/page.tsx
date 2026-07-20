import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { journalEntries, getJournalEntry } from "@/lib/site-journal";

export function generateStaticParams() {
  return journalEntries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getJournalEntry(slug);
  if (!entry) return {};
  return {
    title: entry.title,
    description: entry.dek,
    alternates: { canonical: `/journal/${entry.slug}` },
    openGraph: {
      title: entry.title,
      description: entry.dek,
      type: "article",
      publishedTime: entry.date,
      authors: [entry.author],
    },
  };
}

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getJournalEntry(slug);
  if (!entry) notFound();

  return (
    <article className="max-w-2xl mx-auto px-6 py-16 md:py-20">
      <Link
        href="/journal"
        className="text-xs text-soil/55 hover:text-brick"
      >
        ← All notes
      </Link>
      <div className="small-caps text-[10px] text-soil/55 mt-6 mb-2">
        {entry.date} · {entry.author}
      </div>
      <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-3">
        {entry.title}
      </h1>
      <p className="text-lg text-soil/70 italic leading-relaxed mb-10">
        {entry.dek}
      </p>
      <div className="prose prose-slate max-w-none">
        {entry.body.split("\n\n").map((para, i) => (
          <p key={i} className="mb-4 leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </article>
  );
}
