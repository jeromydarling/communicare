"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { demoSms, demoMembers, formatCents } from "@/lib/farmer-demo";

type Sms = (typeof demoSms)[number];

// Suggested system action per parsed intent — what the SMS webhook would
// do automatically once the farmer approves. This is the "AI proposes,
// human approves" pattern; it makes the swap-by-text loop legible.
function suggestionFor(member: string, sms: Sms | undefined) {
  if (!sms || sms.direction !== "inbound" || !sms.intent) return null;
  const m = demoMembers.find((mm) => mm.display_name === member);
  switch (sms.intent) {
    case "swap":
      // Extract from/to if the body is parseable
      const swapMatch = sms.body.match(
        /swap\s+(.+?)\s+(?:for|to|->|→)\s+(.+)/i,
      );
      return {
        title: "Swap request",
        steps: [
          swapMatch
            ? `Remove "${swapMatch[1]}" from this week's order`
            : "Identify the items to swap",
          swapMatch
            ? `Add "${swapMatch[2]}" to this week's order`
            : "Replace with the requested item",
          "Reply: \"Done. Updated your share.\"",
        ],
        approveLabel: "Apply swap",
      };
    case "skip":
      return {
        title: "Skip-week request",
        steps: [
          "Cancel this week's order (status = cancelled)",
          `Credit ${formatCents(3600)} to ${m?.display_name ?? "the member"}'s account`,
          "Reply: \"Skipped this week. Account credited $36. We'll see you next time.\"",
        ],
        approveLabel: "Approve skip + credit",
      };
    case "pause":
      return {
        title: "Pause request",
        steps: [
          "Pause subscription for the requested number of weeks",
          "Credit the missed weeks to their account",
          "Reply with the resume date",
        ],
        approveLabel: "Pause + credit",
      };
    case "donate":
      return {
        title: "Donate request",
        steps: [
          "Mark this week's order status = donated",
          "Add to the food-bank delivery list",
          `Credit ${formatCents(3600)} to the member's account`,
          "Reply: \"Your share is going to the food pantry. Thank you.\"",
        ],
        approveLabel: "Donate share",
      };
    case "gift":
      return {
        title: "Gift request",
        steps: [
          "Create a one-time gift voucher",
          "SMS the recipient with a magic-link claim",
          "Reply with confirmation when the recipient claims",
        ],
        approveLabel: "Send gift",
      };
    case "unknown":
      return {
        title: "Not parsed",
        steps: [
          "This message doesn't match a known intent",
          "Reply manually, or compose a reply with the templates below",
        ],
        approveLabel: null,
      };
    default:
      return null;
  }
}

export default function FarmerMessagesPage() {
  const threads = useMemo(() => {
    const map = new Map<string, Sms[]>();
    for (const m of demoSms) {
      const list = map.get(m.member) ?? [];
      list.push(m);
      map.set(m.member, list);
    }
    return Array.from(map.entries()).map(([member, msgs]) => ({
      member,
      msgs: msgs.sort((a, b) => a.at.localeCompare(b.at)),
      last: msgs[msgs.length - 1],
    }));
  }, []);

  const [selected, setSelected] = useState(threads[0]?.member ?? "");
  const [draft, setDraft] = useState("");
  const active = threads.find((t) => t.member === selected);
  const lastInbound = active?.msgs
    .slice()
    .reverse()
    .find((m) => m.direction === "inbound");
  const suggestion = suggestionFor(active?.member ?? "", lastInbound);

  return (
    <div>
      <PageHeader
        eyebrow="The two-way SMS inbox"
        title="Messages."
        subtitle="Members text. We parse the intent. You approve in one tap."
      />

      <div className="px-4 md:px-10 py-6 grid md:grid-cols-[260px_1fr_320px] gap-5 min-h-[60vh]">
        {/* Thread list */}
        <div className="paper overflow-hidden h-fit">
          <ul className="divide-y divide-soil/10">
            {threads.map((t) => {
              const isActive = selected === t.member;
              const inboundIntent =
                t.msgs.slice().reverse().find((m) => m.direction === "inbound")?.intent;
              return (
                <li key={t.member}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.member)}
                    className={`w-full text-left px-4 py-4 transition-colors ${
                      isActive ? "bg-wheat/15" : "hover:bg-cream"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="display font-medium">{t.member}</span>
                      <span className="text-[10px] text-soil/45">
                        {t.last.at.split(" ").slice(-2).join(" ")}
                      </span>
                    </div>
                    <p className="text-xs text-soil/65 truncate">
                      {t.last.direction === "inbound" ? "← " : "→ "}
                      {t.last.body}
                    </p>
                    {inboundIntent && inboundIntent !== "unknown" && (
                      <div className="mt-1.5">
                        <IntentChip intent={inboundIntent} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Conversation pane */}
        {active && (
          <div className="paper flex flex-col">
            <div className="px-6 py-4 border-b border-soil/10 flex items-center justify-between">
              <div>
                <h3 className="display text-xl font-medium">{active.member}</h3>
                <div className="text-xs text-soil/55">{active.msgs[0].phone}</div>
              </div>
              <div className="flex gap-2 text-xs">
                <button className="text-soil/65 hover:text-brick display italic">
                  Full profile →
                </button>
              </div>
            </div>
            <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto">
              {active.msgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
                      m.direction === "outbound"
                        ? "bg-soil text-parchment rounded-br-sm"
                        : "bg-cream text-soil rounded-bl-sm"
                    }`}
                  >
                    {m.body}
                    <div
                      className={`text-[10px] mt-1 ${
                        m.direction === "outbound"
                          ? "text-parchment/55"
                          : "text-soil/45"
                      }`}
                    >
                      {m.at}
                      {m.intent && m.intent !== "unknown" && (
                        <span className="ml-2 small-caps">
                          parsed: {m.intent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-soil/10 p-4 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="field flex-1"
                placeholder="Write a reply… (or approve the suggestion →)"
              />
              <button
                type="button"
                onClick={() => setDraft("")}
                className="btn btn-primary text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Intent + suggested action sidebar */}
        <aside className="h-fit space-y-4">
          {suggestion ? (
            <div className="paper p-5">
              <div className="small-caps text-[10px] text-brick mb-1">
                Parsed intent
              </div>
              <h3 className="display text-lg font-medium leading-tight mb-3">
                {suggestion.title}
              </h3>

              <div className="text-xs text-soil/55 small-caps mb-2">
                System will do
              </div>
              <ol className="space-y-2 mb-5">
                {suggestion.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-soil/85">
                    <span className="display text-wheatDark shrink-0">
                      № {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {suggestion.approveLabel ? (
                <div className="space-y-2">
                  <button className="w-full btn btn-primary text-sm justify-center">
                    {suggestion.approveLabel} →
                  </button>
                  <button className="w-full text-soil/55 text-xs italic hover:text-brick">
                    Deny — reply manually
                  </button>
                </div>
              ) : (
                <button className="w-full btn btn-ghost text-sm justify-center">
                  Compose reply manually
                </button>
              )}
            </div>
          ) : (
            <div className="paper p-5 text-sm text-soil/55 italic">
              The most recent inbound message in this thread doesn&apos;t have a
              parsed intent yet. Reply manually.
            </div>
          )}

          {/* Templates */}
          <div className="paper p-5">
            <div className="small-caps text-[10px] text-brick mb-3">
              Quick replies
            </div>
            <ul className="space-y-2 text-sm">
              {[
                "Got it — see you Tuesday.",
                "Apologies, we're sold out of that this week. Want a swap?",
                "Done — your share is updated.",
                "Sorry to hear it — credit posted to your account.",
              ].map((t, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setDraft(t)}
                    className="w-full text-left px-3 py-2 rounded text-soil/85 hover:bg-cream transition-colors"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function IntentChip({ intent }: { intent: string }) {
  const color =
    intent === "swap"
      ? "bg-wheat/25 text-wheatDark"
      : intent === "skip" || intent === "pause"
        ? "bg-brick/15 text-brickDark"
        : intent === "donate" || intent === "gift"
          ? "bg-moss/15 text-mossDark"
          : "bg-soil/10 text-soil/65";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full small-caps text-[9px] tracking-wider ${color}`}
    >
      {intent}
    </span>
  );
}
