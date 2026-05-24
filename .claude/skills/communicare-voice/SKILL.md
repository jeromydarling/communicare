---
name: communicare-voice
description: |
  Keep all Communicare copy, UI, marketing, and documentation in the brand
  voice — Catholic Worker / Rerum Novarum / Wendell Berry, editorial and
  grounded, never SaaS-speak. Use this skill whenever writing or revising
  user-facing text in this project: landing copy, error messages, button
  labels, manifesto edits, README blurbs, marketing site, social posts,
  email templates. Also use when reviewing a PR or diff that touches copy
  to flag voice drift.
---

# Communicare brand voice

A short, opinionated style guide for the Communicare project. Read this
before writing or revising any user-facing string. The voice is the
product's biggest moat — it's what makes a $9 tool feel like a gift
rather than a discount SaaS.

## The one-line voice description

*"A tool placed in the hands of small farms, in the spirit of an old
encyclical or a Wendell Berry essay — warm, grounded, specific, and
unembarrassed by the labor of feeding one another."*

## What to do

- **Be specific.** Name the actual creek, the actual cow, the actual
  variety. *"Twelve Jersey cows, milked by hand"* beats *"premium dairy".*
- **Be plain.** Anglo-Saxon words over Latinate ones. *"Feed"* over
  *"nourish"*. *"Help"* over *"assist"*. The Catholic Worker uses Latin
  only in benedictions (*Pax tibi*).
- **Be slow.** Long sentences with em-dashes, semicolons, and parallel
  clauses. No bullet lists when prose will do. No "TL;DR" sections.
- **Be honest about cost and tradeoffs.** *"It's $9 a month and the AI
  is going to feel uncanny the first time."* Beats *"powerful, intuitive,
  AI-powered platform."*
- **Use ornaments.** ❦, ❀, ※, ◊ as scene-breaks. Latin numerals (№ 01,
  Issue II) for editorial flavor. Drop-caps on opening paragraphs.
- **Be unembarrassed.** Reference Rerum Novarum (1891). Reference the
  liturgical calendar. Use *Pax tibi.* as a closing. We are not afraid
  of being earnest.

## What to never write

| Don't | Why |
|---|---|
| "platform" | This is a tool, not a platform. The distinction matters in §1 of the manifesto. |
| "community-driven" | Empty. Either show the community or say nothing. |
| "passionate about" | Tells the reader what to feel. Show the work instead. |
| "experience" (as a noun for a product) | "the Communicare experience" — never. It's an app, or a tool, or just *Communicare*. |
| "we believe" / "we're on a mission" | Skip the throat-clearing and state the belief. |
| "delight" / "delightful" | A user-research word. Real people say "I like it" or "this is good". |
| "leverage" | Use "use". Always. |
| "seamless" / "frictionless" | Software adjectives. Be specific about what is easy. |
| "ecosystem" | Software-ese. Use "set of tools" or just name what's in it. |
| "10x" / "ROI" / "growth" | Investor language. We are not investor-facing. |
| Emojis in body text | Use ornaments (❦ ◊ ※) instead. Emojis are okay in SMS examples only. |
| Exclamation points in body text | Used sparingly in headlines only; never twice in a row, never in body. |
| "From our family to yours!" | Hokey. Specifics carry warmth. |
| ALL-CAPS for emphasis | Use italic, or restructure. CAPS reads as shouting and breaks the typography. |
| Trademarks/® on our own name | Never. This is a gift. We don't trademark gifts. |

## Texture and rhythm

Prefer this:

> Hannah and Ben bought this place in 2017 with money borrowed from
> Hannah's father. The barn is older than the country. They keep five
> Jersey cows on rotated pasture, forty laying hens following behind,
> an old fruit orchard, and a vegetable plot that's grown a little
> every year. They don't till. They don't spray. They have made every
> mistake there is to make, and they keep coming back to the work.

Over this:

> Hannah and Ben are passionate small farmers who started Wren Hollow
> in 2017. They offer fresh, sustainable produce from their diverse,
> regeneratively-managed farm, including pastured eggs and raw dairy.
> Join the Wren Hollow community today!

Read both aloud. The first sounds like a person. The second sounds like
software.

## Reference paragraphs

When you forget the voice, re-read these from the codebase:

- **The drop-cap opening on `/` (app/page.tsx)** — *"There is a kind of
  work the modern world has forgotten how to honor…"*
- **The manifesto opening (app/manifesto/page.tsx)** — the long-form
  reference. When in doubt, more like this.
- **The Three Forks Dairy farm page (lib/sample-farms.ts → three-forks)**
  — what a generated farm page should feel like.
- **The price section on `/`** — *"$9 per month. for every farm. for as
  long as we exist."* — sets the rhythm for any pricing copy.
- **The "what we won't do" list on `/`** — concrete, declarative,
  promise-shaped. Use this shape for any "we won't" copy.

## Word-by-word substitutions

When you catch yourself writing the left, reach for the right.

| First instinct | Communicare voice |
|---|---|
| sign up | join the circle / come on |
| account | farm (for farmers) / share (for members) |
| dashboard | the tool / your shop |
| user | farmer / member / neighbor |
| customer | member / neighbor / subscriber |
| login | come in (never "log in"; magic link → "the link will let you in") |
| onboarding | settling in |
| pricing | what it costs |
| features | what's given to each farm |
| FAQ | questions, asked & answered |
| testimonials | what other farms have said |
| trial | the first 30 days are free |
| cancel | leave / take your farm with you |
| upgrade | (avoid — there is no upgrade. There is one plan.) |
| support | help (just help — not "support") |
| free tier | (avoid — there is no tier. There is one plan.) |
| roadmap | what we're working on next |
| changelog | what's changed |
| API | (only when relevant, then call it "the developer endpoints") |
| dark mode | (we don't have one yet; do not promise) |

## SMS voice (a separate register)

SMS is one of the two main surfaces, alongside the homepage. SMS uses a
warmer, shorter register than the marketing site. It is allowed to use
the member's first name. It is allowed to use one emoji per message
(usually 🌱 or 🌾). It is never breathless.

Good:

> Hey Sarah — your Tuesday share: kale, carrots, eggs, a chicken.
> Reply SWAP, SKIP, DONATE, or GIFT by Mon 6pm. 🌱

Bad:

> Hi Sarah!! 🎉 Your AMAZING fresh share is ready to be customized!!!
> Click here to see what's in store this week! 👉

## Voice for error messages

Errors are the most common place voice drifts. The pattern:

1. Name what happened, plainly.
2. Take responsibility (use "we", not blame the user).
3. Suggest the next step.

Good:
> The model didn't return a valid homepage this time. Try again — sometimes
> Tuesdays are like that.

Bad:
> Error 500: Internal Server Error. Please refresh and try again.

## A final check before shipping any copy

Read it aloud. If it sounds like a person who has fed someone wrote it,
ship it. If it sounds like a marketing department wrote it, rewrite it.

If you'd be embarrassed for a farmer to read it: rewrite it.

If it could appear unchanged on the homepage of any other SaaS:
rewrite it.

*Pax tibi.*
