"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/farmer/shell";
import {
  getSmsConfig,
  updateSmsConfig,
  listSmsSubscriptions,
  addSmsSubscription,
  deleteSmsSubscription,
  sendSmsTest,
  type SmsConfig,
  type SmsSubscription,
} from "@/lib/farmer/api";

// =============================================================================
// /farmer/sms — the live Tuesday-text dashboard
// =============================================================================
// Three sections:
//   1. Config — outbound number, day-of-week, local hour, timezone,
//      reply window, what-to-do-on-no-reply, active toggle
//   2. Roster — opted-in subscriptions + add-a-member form
//   3. Test send — ping your own phone using the same code path the
//      cron uses
//
// The bones; the inbox and per-member history (the polished demo at
// /farmer/messages) live elsewhere and will eventually pull from
// sms_messages once that table has interesting data.
// =============================================================================

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TZS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

export default function FarmerSmsPage() {
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [subs, setSubs] = useState<SmsSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const [c, s] = await Promise.all([getSmsConfig(), listSmsSubscriptions()]);
    if ("config" in c) setConfig(c.config);
    if ("subscriptions" in s) setSubs(s.subscriptions);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Members who order by texting back"
        title="SMS line."
        subtitle="One text on Tuesday. They reply YES, SKIP, PAUSE, or tell you a swap. No passwords, ever."
      />

      <div className="px-6 md:px-10 py-8 max-w-3xl space-y-8">
        {error && (
          <div className="border border-brick bg-brick/5 px-4 py-3 text-brick text-sm">
            {error}
          </div>
        )}
        {flash && (
          <div className="border border-mossDark bg-mossDark/5 px-4 py-3 text-mossDark text-sm">
            {flash}
          </div>
        )}

        {/* -------- Section 1: Config -------- */}
        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">
            How the line is set up
          </div>
          <h2 className="display text-2xl font-medium mb-6">
            Your outbound number, your schedule.
          </h2>

          {loading || !config ? (
            <p className="text-sm text-soil/65 italic">Loading.</p>
          ) : (
            <ConfigForm
              config={config}
              busy={savingConfig}
              onSave={async (next) => {
                setSavingConfig(true);
                setError(null);
                const res = await updateSmsConfig(next);
                if ("error" in res) {
                  setError(res.error);
                } else {
                  setConfig(res.config);
                  setFlash("Saved.");
                  setTimeout(() => setFlash(null), 2500);
                }
                setSavingConfig(false);
              }}
            />
          )}
        </section>

        {/* -------- Section 2: Roster -------- */}
        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">Roster</div>
          <h2 className="display text-2xl font-medium mb-6">
            Who's on the line.
          </h2>
          <AddMemberForm
            onAdded={async (info) => {
              setError(null);
              setFlash(
                info.already_existed
                  ? "That phone is already on the roster."
                  : info.consent_text_sent
                    ? "Consent text sent. They'll appear as opted-in once they reply YES."
                    : "Added. Consent text didn't go out — check the Twilio number is set above.",
              );
              setTimeout(() => setFlash(null), 4500);
              await reload();
            }}
            onError={(e) => setError(e)}
          />

          <SubscriptionTable
            subs={subs}
            onRemove={async (id) => {
              setError(null);
              if (!confirm("Remove this subscription? They won't get next Tuesday's text.")) return;
              const res = await deleteSmsSubscription(id);
              if ("error" in res) setError(res.error);
              else await reload();
            }}
          />
        </section>

        {/* -------- Section 3: Test -------- */}
        <section className="paper p-8">
          <div className="small-caps text-xs text-brick mb-2">Smoke test</div>
          <h2 className="display text-2xl font-medium mb-6">
            Send yourself a test.
          </h2>
          <p className="text-sm text-soil/70 mb-5">
            Send a one-line test text to a phone you have on you. Uses
            the same code path the Tuesday cron will. If this works,
            the loop works.
          </p>
          <TestSend
            onError={(e) => setError(e)}
            onSent={(sid) => {
              setError(null);
              setFlash(`Sent. Twilio sid: ${sid}.`);
              setTimeout(() => setFlash(null), 5000);
            }}
          />
        </section>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Config form
// -----------------------------------------------------------------------------

function ConfigForm({
  config,
  busy,
  onSave,
}: {
  config: SmsConfig;
  busy: boolean;
  onSave: (next: Parameters<typeof updateSmsConfig>[0]) => Promise<void>;
}) {
  const [phone, setPhone] = useState(config.twilio_phone_number ?? "");
  const [day, setDay] = useState(config.send_day_of_week);
  const [hour, setHour] = useState(config.send_local_hour);
  const [tz, setTz] = useState(config.send_timezone);
  const [window, setWindow] = useState(config.reply_window_hours);
  const [autoAction, setAutoAction] = useState<"confirm" | "skip">(
    config.auto_action_on_no_reply,
  );
  const [active, setActive] = useState(Boolean(config.is_active));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          twilio_phone_number: phone.trim() === "" ? null : phone.trim(),
          send_day_of_week: day,
          send_local_hour: hour,
          send_timezone: tz,
          reply_window_hours: window,
          auto_action_on_no_reply: autoAction,
          is_active: active,
        });
      }}
    >
      <div>
        <label className="label" htmlFor="phone">
          Twilio outbound number
        </label>
        <input
          id="phone"
          className="field"
          placeholder="+15405550101"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div className="hint">
          The phone number you bought from Twilio for this farm.
          Format: +1 followed by ten digits.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="day">Send day</label>
          <select
            id="day"
            className="field"
            value={day}
            onChange={(e) => setDay(parseInt(e.target.value, 10))}
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="hour">Local hour (0–23)</label>
          <input
            id="hour"
            className="field"
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value, 10))}
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="tz">Timezone</label>
        <select
          id="tz"
          className="field"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
        >
          {TZS.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="window">Reply window (hours)</label>
          <input
            id="window"
            className="field"
            type="number"
            min={1}
            max={168}
            value={window}
            onChange={(e) => setWindow(parseInt(e.target.value, 10))}
          />
          <div className="hint">
            After this many hours we lock the offer per your fallback below.
          </div>
        </div>
        <div>
          <label className="label" htmlFor="auto">If no reply</label>
          <select
            id="auto"
            className="field"
            value={autoAction}
            onChange={(e) => setAutoAction(e.target.value as "confirm" | "skip")}
          >
            <option value="confirm">Confirm the share</option>
            <option value="skip">Skip the share</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <span>The line is live (the Tuesday cron will fan out texts)</span>
      </label>

      <div className="pt-3">
        <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy}>
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Add a member
// -----------------------------------------------------------------------------

function AddMemberForm({
  onAdded,
  onError,
}: {
  onAdded: (info: { already_existed: boolean; consent_text_sent: boolean }) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [locale, setLocale] = useState<"en" | "es">("en");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="border-b border-soil/15 pb-6 mb-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!phone.trim()) return onError("Phone required.");
        setBusy(true);
        const res = await addSmsSubscription({
          phone: phone.trim(),
          display_name: name.trim() || undefined,
          locale,
        });
        setBusy(false);
        if ("error" in res) {
          onError(res.error);
        } else {
          setPhone("");
          setName("");
          await onAdded({
            already_existed: res.already_existed,
            consent_text_sent: res.consent_text_sent,
          });
        }
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="add-phone">Phone</label>
          <input
            id="add-phone"
            className="field"
            placeholder="(540) 555-0101"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="add-name">Name (optional)</label>
          <input
            id="add-name"
            className="field"
            placeholder="What you'd call them"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="add-locale">Language</label>
          <select
            id="add-locale"
            className="field"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "es")}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy}>
        {busy ? "Sending consent text…" : "Add member"}
      </button>
      <p className="text-xs text-soil/55 italic">
        We send a one-line consent text to confirm. They appear here as opted-in once they reply YES.
      </p>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Subscription table
// -----------------------------------------------------------------------------

function SubscriptionTable({
  subs,
  onRemove,
}: {
  subs: SmsSubscription[];
  onRemove: (id: string) => Promise<void>;
}) {
  if (subs.length === 0) {
    return (
      <p className="text-sm text-soil/65 italic">
        No one's on the line yet. Add a member above.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs small-caps text-soil/55 border-b border-soil/15">
            <th className="py-2 pr-4">Member</th>
            <th className="py-2 pr-4">Phone</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Since</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s) => (
            <tr key={s.id} className="border-b border-soil/10">
              <td className="py-3 pr-4">{s.display_name ?? "—"}</td>
              <td className="py-3 pr-4 font-mono text-xs">{formatPhone(s.phone_e164)}</td>
              <td className="py-3 pr-4">
                <StatusPill status={s.consent_status} />
              </td>
              <td className="py-3 pr-4 text-soil/55">
                {(s.opted_in_at ?? s.created_at).slice(0, 10)}
              </td>
              <td className="py-3 text-right">
                {s.consent_status !== "opted_out" && (
                  <button
                    onClick={() => onRemove(s.id)}
                    className="text-brick hover:underline text-xs"
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: SmsSubscription["consent_status"] }) {
  const styles = {
    pending: "bg-wheat/15 text-wheatDark",
    opted_in: "bg-mossDark/15 text-mossDark",
    opted_out: "bg-soil/10 text-soil/55",
  } as const;
  const labels = {
    pending: "Pending",
    opted_in: "Opted in",
    opted_out: "Opted out",
  } as const;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

// -----------------------------------------------------------------------------
// Test send
// -----------------------------------------------------------------------------

function TestSend({
  onSent,
  onError,
}: {
  onSent: (sid: string) => void;
  onError: (msg: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col md:flex-row gap-3 items-start md:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!phone.trim()) return onError("Phone required.");
        setBusy(true);
        const res = await sendSmsTest(phone.trim());
        setBusy(false);
        if ("error" in res) onError(res.error);
        else onSent(res.sid);
      }}
    >
      <div className="flex-1 min-w-0 w-full md:w-auto">
        <label className="label" htmlFor="test-phone">Your phone</label>
        <input
          id="test-phone"
          className="field"
          placeholder="(540) 555-0101"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={busy}>
        {busy ? "Sending…" : "Send test"}
      </button>
    </form>
  );
}
