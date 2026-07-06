"use client";

// =============================================================================
// /admin/contact?id=X — one farm's whole story on one page
// =============================================================================
// Uses ?id= so the page is static-exportable (no [id] dynamic segment).
// Everything client-side. Loads via getContact(); refreshes after every
// mutation.
// =============================================================================

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import {
  getContact,
  postNote,
  postAction,
  sendMessage,
  toggleActionDone,
  type ContactDetail,
} from "@/lib/admin/api";

export default function AdminContactPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContactInner />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="px-6 py-10 text-soil/50 italic">Loading contact…</div>
  );
}

function ContactInner() {
  const [id, setId] = useState<string>("");
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("id") ?? "";
    setId(q);
  }, []);

  async function reload() {
    if (!id) return;
    const r = await getContact(id);
    if ("user" in r) setDetail(r);
    else if ("error" in r) setError(r.error);
  }

  useEffect(() => {
    if (id) reload();
  }, [id]);

  if (!id) return <Loading />;
  if (error) {
    return (
      <div className="px-6 py-10">
        <div className="border border-brick bg-brick/5 p-4 text-brick">
          {error}
        </div>
      </div>
    );
  }
  if (!detail) return <Loading />;

  const primaryFarm = detail.farms[0] ?? null;
  const displayName =
    detail.user.display_name ?? detail.profile?.display_name ?? detail.user.email;

  return (
    <div>
      <header className="border-b border-soil/15 px-6 md:px-10 py-6">
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Link href="/admin/contacts/" className="text-soil/55 hover:text-brick">
            ← All contacts
          </Link>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="small-caps text-xs text-brick mb-1">Contact</div>
            <h1 className="display text-3xl md:text-4xl font-medium leading-tight">
              {primaryFarm?.name ?? displayName}
            </h1>
            <p className="text-soil/70 mt-1">
              {displayName} · <span className="font-mono">{detail.user.email}</span>
              {detail.profile?.phone && (
                <>
                  {" · "}
                  <span className="font-mono">{detail.profile.phone}</span>
                </>
              )}
            </p>
          </div>
          <StatusChip status={detail.user.subscription_status ?? "unpaid"} />
        </div>
      </header>

      {flash && (
        <div className="mx-6 md:mx-10 mt-4 border border-mossDark bg-mossDark/5 px-3 py-2 text-mossDark text-sm">
          {flash}
        </div>
      )}

      <div className="px-6 md:px-10 py-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <ComposerCard
            subjectUserId={detail.user.id}
            phone={detail.profile?.phone ?? null}
            busy={busy}
            onSent={(kind) => {
              setFlash(`${kind} sent.`);
              setTimeout(() => setFlash(null), 3000);
              reload();
            }}
            onError={setError}
            setBusy={setBusy}
          />

          <TimelineCard timeline={detail.timeline} />
        </div>

        <div className="space-y-6">
          <NotesCard
            detail={detail}
            onAdded={reload}
            setError={setError}
          />
          <ActionsCard
            detail={detail}
            onChange={reload}
            setError={setError}
          />
          <FarmCard detail={detail} />
          <StripeCard detail={detail} />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Composer — send email or SMS
// -----------------------------------------------------------------------------

function ComposerCard({
  subjectUserId,
  phone,
  busy,
  setBusy,
  onSent,
  onError,
}: {
  subjectUserId: string;
  phone: string | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onSent: (kind: "Email" | "SMS") => void;
  onError: (msg: string) => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function send() {
    if (!body.trim()) return onError("Body is empty.");
    setBusy(true);
    const res = await sendMessage({
      subject_user_id: subjectUserId,
      channel,
      subject: channel === "email" ? subject : undefined,
      body,
    });
    setBusy(false);
    if ("error" in res) return onError(res.error);
    setBody("");
    setSubject("");
    onSent(channel === "email" ? "Email" : "SMS");
  }

  return (
    <section className="paper p-6">
      <div className="small-caps text-xs text-brick mb-3">
        Write to the farmer
      </div>
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setChannel("email")}
          className={`text-xs px-3 py-1.5 rounded ${
            channel === "email" ? "bg-brick text-parchment" : "bg-cream2 text-soil/70"
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setChannel("sms")}
          disabled={!phone}
          className={`text-xs px-3 py-1.5 rounded disabled:opacity-40 ${
            channel === "sms" ? "bg-brick text-parchment" : "bg-cream2 text-soil/70"
          }`}
          title={phone ? undefined : "No phone on file"}
        >
          SMS
        </button>
      </div>

      {channel === "email" && (
        <input
          type="text"
          placeholder="Subject"
          className="field mb-3"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      )}
      <textarea
        className="field font-mono text-sm h-40"
        placeholder={
          channel === "email"
            ? "Write your note. Reply-to gardener@thecros.app."
            : "Short SMS. Sent from the farm's Twilio number."
        }
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-between">
        <div className="text-[10px] italic text-soil/55">
          {channel === "email"
            ? "From: hello@communicare.farm · Reply-to: gardener@thecros.app"
            : phone
              ? `To: ${phone}`
              : "No phone on file — SMS unavailable"}
        </div>
        <button
          type="button"
          onClick={send}
          disabled={busy || !body.trim()}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send →"}
        </button>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Timeline
// -----------------------------------------------------------------------------

function TimelineCard({ timeline }: { timeline: ContactDetail["timeline"] }) {
  return (
    <section className="paper p-6">
      <div className="small-caps text-xs text-brick mb-3">Timeline</div>
      {timeline.length === 0 ? (
        <p className="text-soil/50 italic text-sm">Nothing yet.</p>
      ) : (
        <ol className="space-y-4">
          {timeline.map((entry) => (
            <TimelineEntry key={`${entry.kind}-${entry.id}`} entry={entry} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineEntry({ entry }: { entry: ContactDetail["timeline"][number] }) {
  const label = timelineLabel(entry.kind);
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brick mt-2" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="small-caps text-[10px] text-soil/60">{label}</div>
          <div className="text-[10px] italic text-soil/50">
            {formatWhen(entry.ts)}
          </div>
        </div>
        <div className="text-sm whitespace-pre-wrap text-soil/85 mt-1">
          {entry.payload}
        </div>
      </div>
    </li>
  );
}

function timelineLabel(kind: string): string {
  if (kind === "note") return "Internal note";
  if (kind === "msg_email") return "Email sent";
  if (kind === "msg_sms") return "SMS sent";
  if (kind === "sms_in") return "SMS reply";
  if (kind.startsWith("stripe_")) return `Stripe · ${kind.replace("stripe_", "")}`;
  return kind;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------

function NotesCard({
  detail,
  onAdded,
  setError,
}: {
  detail: ContactDetail;
  onAdded: () => void;
  setError: (msg: string) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    const res = await postNote({
      subject_user_id: detail.user.id,
      body,
      pinned: true,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setBody("");
    onAdded();
  }
  return (
    <section className="paper p-5">
      <div className="small-caps text-xs text-brick mb-2">Notes (pinned)</div>
      <ul className="space-y-3 mb-4">
        {detail.pinned_notes.length === 0 && (
          <li className="text-soil/50 italic text-xs">Nothing pinned.</li>
        )}
        {detail.pinned_notes.map((n) => (
          <li key={n.id} className="text-sm whitespace-pre-wrap border-l-2 border-brick pl-3">
            {n.body}
            <div className="text-[10px] italic text-soil/50 mt-1">
              {formatWhen(n.created_at)}
            </div>
          </li>
        ))}
      </ul>
      <textarea
        className="field font-mono text-xs h-24"
        placeholder="Pin a note (internal-only)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !body.trim()}
        className="btn btn-ghost text-xs mt-2 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Pin note"}
      </button>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Action items
// -----------------------------------------------------------------------------

function ActionsCard({
  detail,
  onChange,
  setError,
}: {
  detail: ContactDetail;
  onChange: () => void;
  setError: (msg: string) => void;
}) {
  const [body, setBody] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  async function add() {
    if (!body.trim()) return;
    setBusy(true);
    const res = await postAction({
      subject_user_id: detail.user.id,
      body,
      snooze_until: when || undefined,
    });
    setBusy(false);
    if ("error" in res) return setError(res.error);
    setBody("");
    setWhen("");
    onChange();
  }
  return (
    <section className="paper p-5">
      <div className="small-caps text-xs text-brick mb-2">Action items</div>
      <ul className="space-y-2 mb-4">
        {detail.open_actions.length === 0 && (
          <li className="text-soil/50 italic text-xs">Nothing open.</li>
        )}
        {detail.open_actions.map((a) => (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-mossDark"
              onChange={async () => {
                await toggleActionDone(a.id, true);
                onChange();
              }}
            />
            <div className="flex-1">
              <div>{a.body}</div>
              {a.snooze_until && (
                <div className="text-[10px] italic text-soil/50">
                  due {a.snooze_until.slice(0, 10)}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <textarea
        className="field font-mono text-xs h-20"
        placeholder="Add a todo about this contact"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        type="date"
        className="field text-xs mt-2"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
      />
      <button
        type="button"
        onClick={add}
        disabled={busy || !body.trim()}
        className="btn btn-ghost text-xs mt-2 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Add action"}
      </button>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Farm + Stripe side cards
// -----------------------------------------------------------------------------

function FarmCard({ detail }: { detail: ContactDetail }) {
  if (detail.farms.length === 0) {
    return (
      <section className="paper p-5">
        <div className="small-caps text-xs text-brick mb-2">Farm</div>
        <p className="text-xs italic text-soil/55">No farm on file.</p>
      </section>
    );
  }
  const f = detail.farms[0];
  return (
    <section className="paper p-5">
      <div className="small-caps text-xs text-brick mb-2">Farm</div>
      <div className="text-sm space-y-1">
        <div>
          <span className="text-soil/55 text-xs">Name</span> · {f.name}
        </div>
        <div>
          <span className="text-soil/55 text-xs">Kind</span> · {f.kind}
        </div>
        <div>
          <span className="text-soil/55 text-xs">Location</span> · {f.location}
        </div>
        <div>
          <span className="text-soil/55 text-xs">Published</span> ·{" "}
          {f.is_published ? "yes" : "not yet"}
        </div>
        <div>
          <a
            href={`https://communicare.farm/farm/${f.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brick hover:underline text-xs"
          >
            View public page →
          </a>
        </div>
      </div>
    </section>
  );
}

function StripeCard({ detail }: { detail: ContactDetail }) {
  return (
    <section className="paper p-5">
      <div className="small-caps text-xs text-brick mb-2">Stripe</div>
      {detail.stripe_subscriptions.length === 0 ? (
        <p className="text-xs italic text-soil/55">No subscription.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {detail.stripe_subscriptions.map((s) => (
            <li key={s.id} className="border-l-2 border-soil/20 pl-2">
              <div className="font-mono">{s.id}</div>
              <div>
                <span className="text-soil/55">Status</span> · {s.status}
              </div>
              <div>
                <span className="text-soil/55">Renews</span> ·{" "}
                {s.current_period_end.slice(0, 10)}
              </div>
              {s.paused_at && (
                <div>
                  <span className="text-soil/55">Paused</span> ·{" "}
                  {s.paused_at.slice(0, 10)}
                  {s.resume_at && ` → ${s.resume_at.slice(0, 10)}`}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-mossDark/15 text-mossDark",
    paused: "bg-wheat/15 text-wheatDark",
    past_due: "bg-brick/15 text-brick",
    canceled: "bg-soil/15 text-soil/60",
    unpaid: "bg-cream2 text-soil/60",
  };
  const cls = map[status] ?? "bg-cream2 text-soil/60";
  return (
    <span className={`inline-block px-3 py-1 rounded small-caps text-xs ${cls}`}>
      {status}
    </span>
  );
}
