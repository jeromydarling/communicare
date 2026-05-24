"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Wheat } from "@/components/mark";

type Item = { name: string; selected: boolean };

const INITIAL: Item[] = [
  { name: "Lacinato kale", selected: true },
  { name: "Hakurei turnips", selected: true },
  { name: "Pastured eggs (1 dozen)", selected: true },
  { name: "Sungold cherry tomatoes (pint)", selected: true },
  { name: "Garlic scapes (bunch)", selected: true },
  { name: "Spring onions (bunch)", selected: true },
  { name: "Sunflower bouquet", selected: true },
];

const SWAPS = [
  "Lacinato kale → Rainbow chard",
  "Hakurei turnips → Radishes",
  "Garlic scapes → Salad mix",
  "Sunflower bouquet → Strawberries (1 quart)",
];

export default function MyShareThisWeek() {
  const [items, setItems] = useState<Item[]>(INITIAL);
  const [showSwap, setShowSwap] = useState(false);
  const [paused, setPaused] = useState(false);
  const [donated, setDonated] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="text-center mb-8">
        <Sun className="w-12 h-12 text-wheat mx-auto mb-4" />
        <div className="small-caps text-xs text-brick mb-2">Hello, Sarah</div>
        <h1 className="display text-4xl md:text-5xl font-medium leading-tight">
          Your Tuesday share.
        </h1>
        <p className="text-soil/65 mt-3">
          Picking up at <span className="display">Donkey Coffee</span> between
          3 &amp; 7 pm.
        </p>
      </div>

      {(paused || donated) && (
        <div className="paper p-5 mb-6 text-center bg-wheat/10 border-wheat/30">
          {paused && (
            <span className="text-soil/85">
              You've paused this week's share. We'll credit your account{" "}
              <span className="display">$36.00</span>.
            </span>
          )}
          {donated && (
            <span className="text-soil/85">
              Your share is being donated to the Athens food pantry. Thank
              you.
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              setDonated(false);
            }}
            className="block mx-auto mt-3 text-xs display italic text-brick hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      <div className="paper p-8 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="display text-2xl">In your box</h2>
          <span className="text-xs text-soil/55">
            7 items · $36.00 charged Monday
          </span>
        </div>
        <ul className="divide-y divide-soil/10">
          {items.map((it, i) => (
            <li key={i} className="py-3 flex items-center gap-3">
              <span className="text-wheat text-lg display leading-none">
                ❀
              </span>
              <span className={it.selected ? "" : "line-through text-soil/45"}>
                {it.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <ActionButton
          icon="⇄"
          label="Swap an item"
          hint="Pick from 4 alternates this week"
          onClick={() => setShowSwap((v) => !v)}
          highlighted={showSwap}
        />
        <ActionButton
          icon="❍"
          label="Skip this week"
          hint="We'll credit your account"
          onClick={() => {
            setPaused(true);
            setDonated(false);
          }}
        />
        <ActionButton
          icon="♥"
          label="Donate this share"
          hint="Goes to the Athens food pantry"
          onClick={() => {
            setDonated(true);
            setPaused(false);
          }}
        />
        <ActionButton
          icon="✉"
          label="Gift to a friend"
          hint="Sends them a magic pickup link"
        />
      </div>

      {showSwap && (
        <div className="paper p-6 mb-6 bg-cream">
          <div className="small-caps text-xs text-brick mb-3">
            Available swaps this week
          </div>
          <ul className="space-y-2">
            {SWAPS.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => {
                    const [from] = s.split(" → ");
                    setItems((prev) =>
                      prev.map((it) =>
                        it.name.startsWith(from)
                          ? { name: s.split(" → ")[1], selected: true }
                          : it,
                      ),
                    );
                    setShowSwap(false);
                  }}
                  className="text-xs display italic text-brick hover:underline"
                >
                  Swap →
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs italic text-soil/55 mt-4">
            Tip: you can also reply to your Tuesday text — just say{" "}
            <span className="font-mono">swap kale for chard</span> and we'll
            handle it.
          </p>
        </div>
      )}

      <div className="text-center text-sm text-soil/65 italic">
        <Wheat className="w-7 h-9 text-wheatDark inline-block mb-1" />
        <div className="mt-1">
          Your next share lands{" "}
          <span className="display">Tuesday, June 3</span>.
        </div>
        <Link
          href="/share/orders/"
          className="display italic text-brick hover:underline mt-3 inline-block"
        >
          See past shares →
        </Link>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  hint,
  onClick,
  highlighted,
}: {
  icon: string;
  label: string;
  hint: string;
  onClick?: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`paper p-5 text-left flex items-start gap-4 transition-colors ${
        highlighted ? "bg-wheat/15 border-wheat/40" : "hover:bg-cream/40"
      }`}
    >
      <span className="text-3xl display text-brick leading-none mt-0.5">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="display text-lg leading-tight">{label}</div>
        <div className="text-xs text-soil/55 italic">{hint}</div>
      </div>
    </button>
  );
}
