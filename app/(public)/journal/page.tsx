import type { Metadata } from "next";
import Link from "next/link";
import { journalEntries } from "@/lib/site-journal";

export const metadata: Metadata = {
  title: "Notes from the workshop",
  description:
    "Short letters from the people building Communicare. When we ship something, when we break something, when we're thinking out loud.",
  alternates: { canonical: "/journal" },
};

export default function JournalIndex() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-20">
      <div className="small-caps text-xs text-brick mb-4">Notes</div>
      <h1 className="display text-5xl md:text-6xl font-medium leading-tight mb-4">
        From the workshop.
      </h1>
      <p className="text-lg text-soil/70 italic leading-relaxed mb-14">
        Short letters from the people building Communicare. When we ship
        something. When we break something. When we&apos;re thinking out
        loud about the next piece.
      </p>

      {journalEntries.length === 0 ? (
        <p className="text-soil/55 italic">Nothing yet.</p>
      ) : (
        <ul className="space-y-10">
          {journalEntries.map((e) => (
            <li key={e.slug}>
              <div className="small-caps text-[10px] text-soil/55 mb-1">
                {e.date} · {e.author}
              </div>
              <h2 className="display text-2xl font-medium mb-2">
                <Link
                  href={`/journal/${e.slug}/`}
                  className="hover:text-brick"
                >
                  {e.title}
                </Link>
              </h2>
              <p className="text-soil/70 italic">{e.dek}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
