import { notFound } from "next/navigation";
import Link from "next/link";
import { getFarm, sampleFarms } from "@/lib/sample-farms";
import { entryForFarm, journalEntries } from "@/lib/journal-entries";
import { Mark } from "@/components/mark";

export function generateStaticParams() {
  return journalEntries.map((e) => ({
    slug: e.farmSlug,
    entry: e.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; entry: string }>;
}) {
  const { slug, entry } = await params;
  const e = entryForFarm(slug, entry);
  return {
    title: e ? e.title : "Journal entry",
    description: e?.excerpt,
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  field: "From the field",
  kitchen: "From the kitchen",
  herd: "From the herd",
  letter: "A letter",
};

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ slug: string; entry: string }>;
}) {
  const { slug, entry } = await params;
  const farm = getFarm(slug);
  const e = entryForFarm(slug, entry);
  if (!farm || !e) notFound();

  return (
    <article className="max-w-2xl mx-auto px-6 py-12 md:py-20">
      <Link
        href={`/farm/${farm.slug}/journal/`}
        className="display italic text-soil/55 hover:text-brick text-sm mb-8 inline-block"
      >
        ← Back to the journal
      </Link>

      <div className="small-caps text-[11px] text-wheat mb-3">
        {CATEGORY_LABEL[e.category]}
      </div>
      <h1 className="display text-4xl md:text-5xl font-medium leading-[1.05] mb-4">
        {e.title}
      </h1>
      <div className="small-caps text-[10px] text-soil/55 mb-10">
        {formatDate(e.publishedOn)} · {e.readMinutes} min · {farm.name}
      </div>

      <div className="space-y-6 text-[1.18rem] leading-[1.75] text-soil/85">
        {e.body.map((para, i) => (
          <p key={i} className={i === 0 ? "drop-cap" : ""}>
            {para}
          </p>
        ))}
      </div>

      <div className="ornament my-12">❦</div>

      <div className="text-center">
        <p className="display italic text-soil/65 mb-6">
          From {farm.name} · {farm.location}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={`/farm/${farm.slug}/journal/`}
            className="btn btn-ghost"
          >
            More from the journal
          </Link>
          <Link
            href={`/farm/${farm.slug}/subscribe/`}
            className="btn btn-primary"
          >
            Subscribe to the share →
          </Link>
        </div>
      </div>

      <div className="mt-20 flex items-center justify-center gap-3 text-soil/45">
        <Mark className="w-5 h-5" />
        <span className="text-xs small-caps">
          Published on communicare
        </span>
      </div>
    </article>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
