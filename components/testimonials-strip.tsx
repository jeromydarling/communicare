import { testimonials } from "@/lib/testimonials";

// =============================================================================
// TestimonialsStrip — real quotes on the landing
// =============================================================================
// Silent when the array is empty (no placeholder theatre). When there
// are 1–2 quotes it renders a centered card; 3+ becomes a small grid.
// =============================================================================

export function TestimonialsStrip() {
  if (testimonials.length === 0) return null;

  return (
    <section className="max-w-page mx-auto px-6 py-20">
      <div className="text-center mb-10">
        <div className="small-caps text-xs text-brick mb-3">
          From the farms already using it
        </div>
        <h2 className="display text-3xl md:text-4xl font-medium">
          In their own words.
        </h2>
      </div>
      <div
        className={
          testimonials.length >= 3
            ? "grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            : "max-w-2xl mx-auto space-y-8"
        }
      >
        {testimonials.map((t, i) => (
          <figure key={i} className="paper p-8">
            <blockquote className="display italic text-lg leading-snug text-soil mb-6">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="text-sm text-soil/70">
              — {t.farmer}
              {t.href ? (
                <>
                  {", "}
                  <a
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brick hover:underline"
                  >
                    {t.farm}
                  </a>
                </>
              ) : (
                <>
                  {", "}
                  <span>{t.farm}</span>
                </>
              )}
              <span className="text-soil/50"> · {t.location}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
