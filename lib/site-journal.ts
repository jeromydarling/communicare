// =============================================================================
// site-journal — Communicare's own workshop notes
// =============================================================================
// Different from farm journal entries (which each farm writes on their
// own page). These are our notes: build reflections, apology when we
// break something, letters from the workshop, quiet product diary.
//
// Add entries here; they surface at /journal and each has its own page
// at /journal/<slug>. Keep the register manifesto-y: editorial, honest,
// short. No release-note dump.
// =============================================================================

export type JournalEntry = {
  slug: string;
  title: string;
  dek: string;             // one-line subtitle
  date: string;            // ISO date
  author: string;
  body: string;            // markdown-friendly plain text; renders as prose
};

export const journalEntries: JournalEntry[] = [
  {
    slug: "the-shape-of-the-thing",
    title: "The shape of the thing",
    dek: "Why Communicare is deliberately small.",
    date: "2026-07-01",
    author: "CROS",
    body: `Every farm-share software we've watched go under carried the same
weight: too many features, too many tiers, a marketing site trying
to sell to an executive who doesn't exist because the buyer is
usually the farmer's sister. We chose the other direction. Nine
dollars a month, monthly contract, no tiers.

If you keep a farm and something is missing, tell us. If you keep
a farm and something is broken, tell us louder. That's the whole
of the plan.`,
  },
];

export function getJournalEntry(slug: string): JournalEntry | undefined {
  return journalEntries.find((e) => e.slug === slug);
}
