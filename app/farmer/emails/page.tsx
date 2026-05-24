"use client";

import { useState } from "react";
import { PageHeader } from "@/components/farmer/shell";

type TemplateId =
  | "field-guide"
  | "welcome"
  | "steward"
  | "harvest-update"
  | "blank";

const TEMPLATES: {
  id: TemplateId;
  name: string;
  hint: string;
  subject: string;
  body: string[];
}[] = [
  {
    id: "field-guide",
    name: "The Field Guide",
    hint: "Weekly newsletter — what's in the share, one recipe, one note",
    subject: "Tuesday's share · The Field Guide № 14",
    body: [
      "Dear neighbor,",
      "This week's share: lacinato kale, hakurei turnips, sungold tomatoes, garlic scapes, spring onions, a small bouquet of zinnias from the corner field.",
      "The recipe is a quick turnip-top pesto — wilt the greens of the hakurei in olive oil, blend with garlic and walnuts, salt heavily. Better on grilled bread than basil pesto, in our opinion.",
      "A note from the field: the deer found the lettuce on Saturday night. We have netted the remaining beds and replanted three rows. Next week's share may be light on greens and heavy on roots.",
      "See you Tuesday.",
    ],
  },
  {
    id: "welcome",
    name: "Welcome to the table",
    hint: "First-week message for new members",
    subject: "Welcome to Wren Hollow",
    body: [
      "Dear neighbor,",
      "Welcome to Wren Hollow, and thank you for trusting us with the work of feeding you for the next twenty-two weeks.",
      "Here is how this will go. Every Monday afternoon you'll get a text from us with what's in your share for Tuesday. You can reply with SWAP, SKIP, DONATE, or GIFT — or do nothing, in which case the share comes as listed.",
      "You can pick up at the farm Tuesdays 3 to 7, or in town Wednesdays at Donkey Coffee 8 to noon. You can change pickup any week by replying to the text.",
      "When something goes wrong — and it will — we'll tell you what happened. That's a promise.",
      "Pax tibi.",
    ],
  },
  {
    id: "steward",
    name: "A note from the steward",
    hint: "Long-form letter, used 2-3 times a season",
    subject: "A note from the field",
    body: [
      "Dear neighbor,",
      "It's the last week of June and the farm is doing the thing it does every year at this point — too much of one thing, not enough of another, and a heat that makes us tired by ten in the morning.",
      "The tomatoes are setting. The garlic is hung in the barn to cure. The chickens are laying twenty-six dozen a week and giving us the chickeny side-eye that means they want to move pasture.",
      "Thank you for being part of this. The work of feeding you is the work that keeps this place a farm, and that means more this year than it has in any previous one.",
    ],
  },
  {
    id: "harvest-update",
    name: "Harvest update",
    hint: "Short, transactional — schedule changes, delays, special pickup days",
    subject: "Schedule update for the week of June 12",
    body: [
      "Quick note: this week's farm pickup is moved to Wednesday because of the forecast. Same window — 3 to 7. The town pickup at Donkey Coffee is unchanged.",
      "If Wednesday doesn't work, reply SKIP and we'll credit you for the week.",
      "Thanks for the flexibility.",
    ],
  },
  {
    id: "blank",
    name: "Blank canvas",
    hint: "Start from nothing",
    subject: "",
    body: [""],
  },
];

const PAST_SENDS = [
  {
    subject: "Tuesday's share · The Field Guide № 13",
    sentOn: "May 21",
    opens: 287,
    members: 312,
  },
  {
    subject: "Schedule update for the week of May 14",
    sentOn: "May 13",
    opens: 304,
    members: 312,
  },
  {
    subject: "A letter from the field, late spring",
    sentOn: "May 4",
    opens: 271,
    members: 312,
  },
];

export default function EmailsPage() {
  const [active, setActive] = useState<TemplateId>("field-guide");
  const current = TEMPLATES.find((t) => t.id === active)!;
  const [subject, setSubject] = useState(current.subject);
  const [body, setBody] = useState(current.body.join("\n\n"));

  function pickTemplate(id: TemplateId) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setActive(id);
    setSubject(t.subject);
    setBody(t.body.join("\n\n"));
  }

  return (
    <div>
      <PageHeader
        eyebrow="A small newsletter, sent by you"
        title="Emails."
        subtitle="The way most of your members hear from you between Tuesdays. Pick a template, write to your neighbors, send."
        action={
          <div className="flex gap-2">
            <button className="btn btn-ghost text-sm">Save draft</button>
            <button className="btn btn-primary text-sm">Send to all 312 →</button>
          </div>
        }
      />

      <div className="px-4 md:px-10 py-6 grid lg:grid-cols-[220px_1fr_320px] gap-6">
        {/* Template library */}
        <aside className="space-y-3">
          <div className="small-caps text-[10px] text-soil/55 px-2">
            Templates
          </div>
          <ul className="space-y-1">
            {TEMPLATES.map((t) => {
              const isActive = active === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pickTemplate(t.id)}
                    className={`w-full text-left px-3 py-3 rounded-md transition-colors ${
                      isActive ? "bg-wheat/15" : "hover:bg-cream"
                    }`}
                  >
                    <div className="display text-sm">{t.name}</div>
                    <div className="text-[10px] text-soil/55 italic mt-0.5">
                      {t.hint}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rule my-6" />

          <div className="small-caps text-[10px] text-soil/55 px-2">
            Recently sent
          </div>
          <ul className="space-y-2">
            {PAST_SENDS.map((s) => (
              <li key={s.subject} className="px-2 py-2">
                <div className="display text-xs leading-tight">
                  {s.subject}
                </div>
                <div className="text-[10px] text-soil/55 mt-1">
                  {s.sentOn} · {s.opens} of {s.members} opened
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Composer */}
        <div className="paper p-7">
          <div className="space-y-5">
            <div>
              <div className="small-caps text-[10px] text-soil/55 mb-1">
                To
              </div>
              <div className="text-sm display flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-cream text-xs">
                  All active members (312)
                </span>
                <button className="text-soil/55 hover:text-brick text-xs italic">
                  + Segment
                </button>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="subject">
                Subject
              </label>
              <input
                id="subject"
                className="field display text-lg"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="The Field Guide № 14"
              />
            </div>

            <div>
              <label className="label" htmlFor="body">
                Body
              </label>
              <textarea
                id="body"
                className="field font-body text-base"
                rows={16}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Dear neighbor,"
                style={{ lineHeight: 1.6 }}
              />
              <div className="hint">
                Plain text. We&apos;ll wrap it in the farm&apos;s editorial
                template — Fraunces display + Source Serif body + your logo
                + an unsubscribe link members never need to use.
              </div>
            </div>

            <div className="border-t border-soil/15 pt-4 flex items-center gap-3 flex-wrap">
              <button className="btn btn-ghost text-sm">Send to self only</button>
              <button className="btn btn-ghost text-sm">Schedule for Monday 4pm</button>
              <span className="text-xs italic text-soil/55 ml-auto">
                Auto-saved 2 min ago
              </span>
            </div>
          </div>
        </div>

        {/* Preview pane */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="small-caps text-[10px] text-brick mb-2">
            Preview
          </div>
          <div className="paper overflow-hidden">
            <div className="bg-cream border-b border-soil/15 px-4 py-2 text-xs text-soil/55">
              From Wren Hollow Farm
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="small-caps text-[10px] text-wheat">
                  Wren Hollow Farm
                </div>
                <div className="text-[10px] text-soil/55 italic">
                  Floyd County, Virginia
                </div>
              </div>
              <h3 className="display text-xl font-medium leading-tight mb-4">
                {subject || "Untitled"}
              </h3>
              <div className="space-y-3 text-sm text-soil/85 leading-relaxed">
                {body.split("\n\n").map((para, i) => (
                  <p key={i} className={i === 0 ? "drop-cap" : ""}>
                    {para || <span className="italic text-soil/45">…</span>}
                  </p>
                ))}
              </div>
              <div className="ornament mt-6">❦</div>
              <div className="text-center text-[10px] text-soil/45 italic mt-4">
                Reply STOP to unsubscribe · communicare.farm
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
