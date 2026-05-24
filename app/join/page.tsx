"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Wheat } from "@/components/mark";

export default function JoinPage() {
  const [submitted, setSubmitted] = useState(false);
  const [farmName, setFarmName] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In the real app this posts to /api/waitlist and stores the entry.
    // For the demo, we acknowledge and let the user feel held.
    setSubmitted(true);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-20 md:py-28">
      {submitted ? (
        <div className="text-center">
          <Sun className="w-16 h-16 text-wheat mx-auto mb-6" />
          <div className="small-caps text-xs text-brick mb-4">
            Welcome to the circle
          </div>
          <h1 className="display text-5xl font-medium leading-tight mb-6">
            Thank you{farmName ? `, ${farmName}` : ""}.
          </h1>
          <p className="text-lg text-soil/80 leading-relaxed">
            We have you. We'll email when we're ready to receive your farm —
            with a magic link, no password to invent. In the meantime, the
            land needs you more than we do.
          </p>
          <p className="display italic text-brick mt-8 text-xl">Pax tibi.</p>

          <div className="rule my-12" />

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/homepage" className="btn btn-ghost">
              Try the AI homepage
            </Link>
            <Link href="/manifesto" className="btn btn-ghost">
              Read why we built this
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-12">
            <Wheat className="w-12 h-14 text-wheatDark mx-auto mb-6" />
            <div className="small-caps text-xs text-brick mb-4">
              The early circle
            </div>
            <h1 className="display text-5xl md:text-6xl font-medium leading-[1.0]">
              Join us.
            </h1>
            <p className="mt-6 text-lg text-soil/80 leading-relaxed max-w-md mx-auto">
              We're building Communicare for a small first group of farms.
              Leave your name and a way to reach you, and we'll email when
              we're ready to bring your farm on.
            </p>
          </div>

          <form onSubmit={onSubmit} className="paper p-10 space-y-6">
            <div>
              <label className="label" htmlFor="who">
                Who are you?
              </label>
              <input
                id="who"
                required
                className="field"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="label" htmlFor="farm">
                What's the farm called?
              </label>
              <input
                id="farm"
                required
                className="field"
                placeholder="e.g. Three Forks Dairy"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="label" htmlFor="loc">
                  Where is it?
                </label>
                <input
                  id="loc"
                  required
                  className="field"
                  placeholder="County, State"
                />
              </div>
              <div>
                <label className="label" htmlFor="kind">
                  What do you do?
                </label>
                <select id="kind" className="field" defaultValue="">
                  <option value="" disabled>
                    Pick one
                  </option>
                  <option>Vegetable CSA</option>
                  <option>Raw milk herd share</option>
                  <option>Pastured meat</option>
                  <option>Pastured eggs</option>
                  <option>Mixed farm</option>
                  <option>Market garden</option>
                  <option>Orchard / fruit</option>
                  <option>Flowers</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="field"
                placeholder="you@yourfarm.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="note">
                Anything else? (optional)
              </label>
              <textarea
                id="note"
                className="field"
                placeholder="Where are you now (Barn2Door, spreadsheets, paper, nothing yet)? What's the most painful part?"
                rows={3}
              />
            </div>

            <div className="pt-4 border-t border-soil/15 flex items-center justify-between gap-4">
              <button type="submit" className="btn btn-primary">
                Send →
              </button>
              <span className="text-xs italic text-soil/55 max-w-xs text-right">
                We will not put you on a list, sell you anything, or write you
                a single sales email.
              </span>
            </div>
          </form>

          <p className="text-center text-xs text-soil/55 italic mt-8 max-w-sm mx-auto leading-relaxed">
            Already running a farm share? When we're ready, we'll migrate you
            from Harvie, Barn2Door, Local Line, or your spreadsheets — by
            hand, free of charge.
          </p>
        </>
      )}
    </div>
  );
}
