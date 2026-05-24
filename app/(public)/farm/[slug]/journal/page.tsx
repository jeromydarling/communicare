import { notFound } from "next/navigation";
import Link from "next/link";
import { getFarm, sampleFarms } from "@/lib/sample-farms";
import { entriesForFarm } from "@/lib/journal-entries";
import { Mark } from "@/components/mark";

export function generateStaticParams() {
  return sampleFarms.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const farm = getFarm(slug);
  return {
    title: farm ? `Journal — ${farm.name}` : "Journal",
    description: farm
      ? `Long-form letters from ${farm.name}: field notes, kitchen ideas, and word from the farmer.`
      : undefined,
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  field: "From the field",
  kitchen: "From the kitchen",
  herd: "From the herd",
  letter: "A letter",
};

export default async function JournalIndex({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const farm = getFarm(slug);
  if (!farm) notFound();
  const entries = entriesForFarm(slug);

  return (
    <div>
      <div className="border-b border-soil/15 bg-cream">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <Link
            href={`/farm/${farm.slug}/`}
            className="display italic text-soil/55 hover:text-brick text-sm mb-6 inline-block"
          >
            ← Back to {farm.name}
          </Link>
          <div className="small-caps text-xs text-brick mb-3">
            The farm journal
          </div>
          <h1 className="display text-5xl md:text-6xl font-medium leading-[1.0]">
            From {farm.name}.
          </h1>
          <p className="text-soil/70 italic mt-4 max-w-md mx-auto">
            Long-form letters from the farm. Field notes, kitchen ideas, and
            word from the people who keep this place going.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {entries.length === 0 && (
          <div className="text-center text-soil/55 italic py-16">
            <Mark className="w-12 h-12 text-brick mx-auto mb-4 opacity-60" />
            <p>
              No entries yet — the season is young. Come back when the
              tomatoes are in.
            </p>
          </div>
        )}
        {entries.map((entry, i) => (
          <article
            key={entry.slug}
            className={`${i > 0 ? "pt-12 border-t border-soil/10" : ""}`}
          >
            <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
              <div className="small-caps text-[11px] text-wheat">
                {CATEGORY_LABEL[entry.category]}
              </div>
              <div className="small-caps text-[10px] text-soil/55">
                {formatDate(entry.publishedOn)} · {entry.readMinutes} min
              </div>
            </div>
            <h2 className="display text-3xl md:text-4xl font-medium leading-tight mb-3">
              <Link
                href={`/farm/${farm.slug}/journal/${entry.slug}/`}
                className="hover:text-brick transition-colors"
              >
                {entry.title}
              </Link>
            </h2>
            <p className="text-lg text-soil/80 leading-relaxed mb-4">
              {entry.excerpt}
            </p>
            <Link
              href={`/farm/${farm.slug}/journal/${entry.slug}/`}
              className="display italic text-brick hover:underline text-sm"
            >
              Keep reading →
            </Link>
          </article>
        ))}
      </div>

      <div className="ornament my-16 max-w-md mx-auto">❦</div>

      <div className="text-center pb-20">
        <Link
          href={`/farm/${farm.slug}/subscribe/`}
          className="btn btn-primary"
        >
          Subscribe to {farm.name} →
        </Link>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
