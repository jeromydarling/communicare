"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Wheat, Barn } from "@/components/mark";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/brand-strings";

// =============================================================================
// /claim?slug=... — the page a discovered-farm operator lands on
// =============================================================================
// When the find-nearby-farms function surfaces a farm via Perplexity, the
// one-time outreach email points the farmer here. The page reads the slug
// from the query string (we can't pre-generate dynamic slugs in a static
// export), pulls the row from Supabase via the anon RLS-friendly view,
// and shows the operator three things:
//
//   1. Their listing as it currently appears — name, kind, what we know
//   2. Evidence: how many neighbors have searched for them, how many sent
//      a note (anonymised — sender names only, no contact info)
//   3. The claim path — verify ownership, link to a new or existing farm,
//      take over the listing
//
// We never sell or extract this data. Either they claim it or they ignore
// us; the directory entry survives either way and they can opt out forever
// with one click.
// =============================================================================

type ClaimableFarm = {
  id: string;
  slug: string | null;
  name: string;
  kind: string | null;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  pickup_info: string | null;
  share_price: string | null;
  inquiry_count: number;
  last_inquiry_at: string | null;
  claimed_at: string | null;
  opted_out_at: string | null;
  citations: string[] | null;
  discovered_via_zip: string | null;
};

type Inquiry = {
  id: string;
  sender_name: string;
  sender_zip: string | null;
  body: string;
  sent_at: string;
};

export default function ClaimPage() {
  const [slug, setSlug] = useState<string | null>(null);
  const [farm, setFarm] = useState<ClaimableFarm | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Static export — can't use useSearchParams without a Suspense boundary.
    // Read directly off the URL.
    const params = new URLSearchParams(window.location.search);
    const s = params.get("slug");
    setSlug(s);
    if (!s) {
      setLoading(false);
      return;
    }
    (async () => {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setError("This page needs Supabase to load. Check back later.");
        setLoading(false);
        return;
      }

      // Look up by slug OR by uuid (the email may have either)
      const looksLikeUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          s,
        );
      const query = supabase
        .from("discovered_farms")
        .select(
          "id, slug, name, kind, description, location, city, state, website, email, phone, pickup_info, share_price, inquiry_count, last_inquiry_at, claimed_at, opted_out_at, citations, discovered_via_zip",
        )
        .limit(1);
      const { data, error: fnError } = await (looksLikeUuid
        ? query.eq("id", s)
        : query.eq("slug", s));

      if (fnError) {
        setError(fnError.message);
        setLoading(false);
        return;
      }
      type Row = ClaimableFarm;
      const row = (data as Row[] | null)?.[0] ?? null;
      if (!row) {
        setError("not_found");
        setLoading(false);
        return;
      }
      setFarm(row);

      // Pull anonymised inquiries (RLS lets the claimed farm read all of
      // theirs; for unclaimed rows the anon role won't see contact info
      // but can see sender_name + body via the public-read policy we set
      // up). For safety, we also strip emails from the body before showing.
      const { data: iq } = await supabase
        .from("farm_inquiries")
        .select("id, sender_name, sender_zip, body, sent_at")
        .eq("discovered_farm_id", row.id)
        .order("sent_at", { ascending: false })
        .limit(10);
      setInquiries((iq as Inquiry[] | null) ?? []);
      setLoading(false);
    })();
  }, []);

  if (!slug) {
    return <ClaimMissing />;
  }
  if (loading) {
    return (
      <div className="max-w-page mx-auto px-6 py-20 text-center">
        <Wheat className="w-10 h-12 text-wheatDark mx-auto mb-4 opacity-60 animate-pulse" />
        <p className="display text-lg text-soil/70">Looking up the listing…</p>
      </div>
    );
  }
  if (error === "not_found" || !farm) {
    return <ClaimMissing />;
  }
  if (error) {
    return (
      <div className="max-w-page mx-auto px-6 py-20 text-center">
        <p className="display text-lg text-brick">{error}</p>
      </div>
    );
  }

  if (farm.claimed_at) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="small-caps text-xs text-brick mb-3">Already claimed</div>
        <h1 className="display text-4xl font-medium mb-4">
          {farm.name} is on Communicare.
        </h1>
        <p className="text-soil/70 leading-relaxed">
          This listing was claimed on{" "}
          {new Date(farm.claimed_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . If that wasn't you and something looks off, write to{" "}
          <a
            href={SUPPORT_MAILTO}
            className="text-brick hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  }

  if (farm.opted_out_at) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="small-caps text-xs text-brick mb-3">Opted out</div>
        <h1 className="display text-3xl font-medium mb-4">
          This listing has been removed.
        </h1>
        <p className="text-soil/70 leading-relaxed">
          {farm.name} asked not to be listed in our directory. We honor that.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Eyebrow */}
      <div className="small-caps text-xs text-brick mb-3">
        Your listing on Communicare
      </div>
      <h1 className="display text-4xl md:text-5xl font-medium leading-tight mb-3">
        {farm.name}
      </h1>
      <div className="text-sm text-soil/65 italic mb-8">
        {farm.location ?? `${farm.city ?? ""}, ${farm.state ?? ""}`} ·{" "}
        {farm.kind ?? "Farm share"}
      </div>

      {/* Evidence — neighbors are asking */}
      <section className="paper p-7 mb-10 border-wheat/50 bg-wheat/10">
        <div className="small-caps text-xs text-brick mb-2">
          Why we wrote
        </div>
        <p className="display text-2xl font-medium leading-snug mb-1">
          {farm.inquiry_count === 0 ? (
            <>
              You're on the map. Neighbors will start finding you.
            </>
          ) : farm.inquiry_count === 1 ? (
            <>One neighbor has reached out about your farm.</>
          ) : (
            <>
              {farm.inquiry_count} neighbors have reached out about your
              farm.
            </>
          )}
        </p>
        {farm.last_inquiry_at && (
          <p className="text-xs text-soil/65 italic">
            Most recently on{" "}
            {new Date(farm.last_inquiry_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        )}
      </section>

      {/* What we know */}
      <section className="mb-10">
        <h2 className="display text-2xl font-medium mb-4">
          What we know about you
        </h2>
        <p className="text-sm text-soil/65 italic mb-5 leading-snug">
          This is the public listing as it appears today. It came from
          public sources and automated research, and may need correcting. When you
          claim the listing, you take over the keys.
        </p>
        <dl className="grid sm:grid-cols-[140px_1fr] gap-x-5 gap-y-3 text-sm">
          <dt className="small-caps text-[10px] text-soil/55 pt-1">Kind</dt>
          <dd>{farm.kind ?? <em className="text-soil/45">unknown</em>}</dd>

          <dt className="small-caps text-[10px] text-soil/55 pt-1">
            Description
          </dt>
          <dd>
            {farm.description ?? (
              <em className="text-soil/45">none on record yet</em>
            )}
          </dd>

          <dt className="small-caps text-[10px] text-soil/55 pt-1">Web</dt>
          <dd>
            {farm.website ? (
              <a
                href={farm.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brick hover:underline"
              >
                {farm.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <em className="text-soil/45">no website on record</em>
            )}
          </dd>

          <dt className="small-caps text-[10px] text-soil/55 pt-1">Pickup</dt>
          <dd>
            {farm.pickup_info ?? <em className="text-soil/45">unknown</em>}
          </dd>

          <dt className="small-caps text-[10px] text-soil/55 pt-1">Share</dt>
          <dd>
            {farm.share_price ?? <em className="text-soil/45">unknown</em>}
          </dd>
        </dl>
      </section>

      {/* Inquiries — only show senders + scrubbed bodies */}
      {inquiries.length > 0 && (
        <section className="mb-10">
          <h2 className="display text-2xl font-medium mb-4">
            Notes from neighbors
          </h2>
          <p className="text-sm text-soil/65 italic mb-5 leading-snug">
            Only the sender's first name shows here. When you claim the
            listing, we hand you their full notes and contact info — these
            are people who already asked about you.
          </p>
          <ul className="space-y-4">
            {inquiries.map((iq) => (
              <li
                key={iq.id}
                className="paper p-5 text-sm leading-relaxed text-soil/85"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <span className="display font-medium">
                    {firstName(iq.sender_name)}
                    {iq.sender_zip && (
                      <span className="text-soil/55 text-xs italic ml-2">
                        · {iq.sender_zip}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-soil/55 italic shrink-0">
                    {new Date(iq.sent_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-line">
                  {scrubBody(iq.body)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The actual claim CTA */}
      <section className="paper p-7 mb-8 bg-cream2/40">
        <div className="small-caps text-xs text-brick mb-2">
          Is this your farm?
        </div>
        <h2 className="display text-3xl font-medium mb-3 leading-tight">
          Take over the listing.
        </h2>
        <p className="text-sm text-soil/75 leading-relaxed mb-5">
          Joining Communicare gets you the full notes from your neighbors,
          the keys to edit your listing, a free homepage drafted from a few
          sentences in your own voice, and the SMS swap loop your members
          will actually use.
          Nine dollars a month, no setup, no contract. The directory listing
          is yours either way.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/join?from=claim&slug=${encodeURIComponent(slug ?? "")}&name=${encodeURIComponent(farm.name)}`}
            className="btn btn-primary text-sm"
          >
            This is my farm →
          </Link>
          <a
            href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent("Edit my listing — " + farm.name)}&body=${encodeURIComponent("I'd like to update the listing for " + farm.name + " (" + (farm.location ?? "") + "). Here's what's right or wrong:\n\n")}`}
            className="btn btn-ghost text-sm"
          >
            Just fix something for me
          </a>
        </div>
      </section>

      {/* The honest opt-out */}
      <section className="text-xs text-soil/55 italic leading-relaxed border-t border-soil/10 pt-6">
        <p className="mb-2">
          Don't want to be listed at all?{" "}
          <a
            href={`${SUPPORT_MAILTO}?subject=${encodeURIComponent("Remove " + farm.name + " from Communicare directory")}&body=${encodeURIComponent("Please remove " + farm.name + " (listing id " + farm.id + ") from the Communicare directory permanently. Thank you.")}`}
            className="text-brick not-italic hover:underline"
          >
            Write us and we'll honor it forever.
          </a>{" "}
          The promise on our{" "}
          <Link href="/manifesto" className="text-brick not-italic hover:underline">
            manifesto
          </Link>{" "}
          extends to unclaimed listings.
        </p>
        <p>
          We don't sell the directory. We don't share who searched for you.
          The only thing this page does is route neighbors to you.
        </p>
      </section>

      {farm.citations && farm.citations.length > 0 && (
        <details className="mt-6 text-[11px] text-soil/45">
          <summary className="cursor-pointer hover:text-soil/65">
            Where this listing came from
          </summary>
          <ul className="mt-2 space-y-0.5 pl-3 list-disc">
            {farm.citations.slice(0, 6).map((c, i) => (
              <li key={i} className="truncate">
                <a
                  href={c}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {c.replace(/^https?:\/\//, "").slice(0, 80)}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Only show the first name — not the surname, not the email — so the
// unclaimed listing stays as private as we can make it.
function firstName(full: string): string {
  return full.split(/\s+/)[0] ?? full;
}

// Light email scrubbing on body display — RLS already gates the read,
// but a belt-and-suspenders.
function scrubBody(body: string): string {
  return body
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[phone]");
}

function ClaimMissing() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <Barn className="w-12 h-10 text-wheatDark mx-auto mb-4 opacity-60" />
      <div className="small-caps text-xs text-brick mb-3">No such listing</div>
      <h1 className="display text-3xl font-medium mb-4">
        We can't find that farm in our directory.
      </h1>
      <p className="text-soil/65 leading-relaxed mb-6">
        The link may have been pasted wrong, or the listing may have been
        removed. Either way, you can search for your farm on the map and
        we'll write back if we can help.
      </p>
      <div className="flex justify-center gap-3 flex-wrap">
        <Link href="/find" className="btn btn-primary text-sm">
          Find your farm →
        </Link>
        <Link href="/join" className="btn btn-ghost text-sm">
          Join the early circle
        </Link>
      </div>
    </div>
  );
}

