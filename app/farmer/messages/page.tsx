"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/farmer/shell";
import { demoSms } from "@/lib/farmer-demo";

export default function FarmerMessagesPage() {
  // Group by member
  const threads = useMemo(() => {
    const map = new Map<string, typeof demoSms>();
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

  return (
    <div>
      <PageHeader
        eyebrow="The two-way SMS inbox"
        title="Messages."
        subtitle="Members text the farm number. You see it here. Reply once; templates fill the rest."
      />

      <div className="px-4 md:px-10 py-6 grid md:grid-cols-[280px_1fr] gap-6 min-h-[60vh]">
        {/* Thread list */}
        <div className="paper overflow-hidden">
          <ul className="divide-y divide-soil/10">
            {threads.map((t) => {
              const active = selected === t.member;
              return (
                <li key={t.member}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.member)}
                    className={`w-full text-left px-4 py-4 transition-colors ${
                      active ? "bg-wheat/15" : "hover:bg-cream"
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
                    {t.last.intent && t.last.direction === "inbound" && (
                      <div className="text-[10px] small-caps text-brick mt-1">
                        {t.last.intent}
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
            <div className="px-6 py-4 border-b border-soil/10">
              <h3 className="display text-xl font-medium">{active.member}</h3>
              <div className="text-xs text-soil/55">{active.msgs[0].phone}</div>
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
                      {m.intent && (
                        <span className="ml-2 small-caps">{m.intent}</span>
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
                placeholder="Type a reply…"
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
      </div>
    </div>
  );
}
