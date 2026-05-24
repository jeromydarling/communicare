import Link from "next/link";
import { Wheat, Sun, Jar, Leaf, Barn } from "@/components/mark";
import { sampleFarms } from "@/lib/sample-farms";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-40 pointer-events-none" />
        <div className="max-w-page mx-auto px-6 pt-16 md:pt-24 pb-20 md:pb-28 relative">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="small-caps text-xs text-brick mb-6 fade-up">
                <span>Issue №&nbsp;01 · Spring of the year MMXXVI</span>
              </div>
              <h1 className="display text-[3.4rem] md:text-[5.5rem] leading-[0.94] tracking-[-0.025em] font-medium fade-up fade-up-delay-1">
                For the farms
                <br />
                that feed us.
              </h1>
              <p className="mt-8 max-w-2xl text-xl md:text-2xl leading-relaxed text-soil/85 fade-up fade-up-delay-2">
                A small, slow-built tool for the farm shares, raw-milk dairies,
                meat shares, and market gardens that hold this country
                together. Members order by texting back. You keep your own
                Stripe. Nine dollars a month, the same for every farm, with no
                contract and no setup. We made this as a gift.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4 fade-up fade-up-delay-3">
                <Link href="/homepage" className="btn btn-primary">
                  Try the AI homepage →
                </Link>
                <Link href="/join" className="btn btn-ghost">
                  Join the early circle
                </Link>
                <span className="text-sm text-soil/55 italic ml-2">
                  (no credit card. no demo call. ever.)
                </span>
              </div>
            </div>
            <div className="md:col-span-4 hidden md:flex justify-end">
              <div className="relative">
                <Sun className="w-44 h-44 text-wheat" />
                <Wheat className="absolute -bottom-4 -left-10 w-24 h-32 text-mossDark" />
                <Wheat className="absolute -bottom-6 left-2 w-20 h-28 text-mossDark opacity-70" />
                <Leaf className="absolute top-6 -right-6 w-14 h-14 text-moss" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OPENING STATEMENT — manifesto-lite */}
      <section className="border-t border-b border-soil/15 bg-cream">
        <div className="max-w-page mx-auto px-6 py-20">
          <div className="ornament mb-12">❦</div>
          <div className="max-w-3xl mx-auto">
            <p className="drop-cap text-2xl md:text-[1.7rem] leading-[1.55] text-soil/90 font-light">
              There is a kind of work the modern world has forgotten how to
              honor — the patient labor of growing food, raising animals,
              keeping a piece of land alive across generations. The farms that
              do this work are small, mostly family-held, mostly tired, and
              quietly essential. They deserve better than software that treats
              them like a SaaS funnel.
            </p>
            <p className="mt-8 text-lg leading-relaxed text-soil/80">
              We built Communicare as a gift to those farms and to the
              neighbors they feed. It is not a platform. It is not a
              marketplace. It is a small tool placed in the hands of the
              people who feed us — and we promise to keep it that way.
            </p>
            <div className="mt-10">
              <Link
                href="/manifesto"
                className="display italic text-brick hover:underline underline-offset-4 decoration-1"
              >
                Read why we built this →
              </Link>
            </div>
          </div>
          <div className="ornament mt-12">❦</div>
        </div>
      </section>

      {/* WHAT YOU GET — editorial spread */}
      <section className="max-w-page mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="small-caps text-xs text-brick mb-3">
            What is given to each farm
          </div>
          <h2 className="display text-5xl md:text-6xl font-medium">
            The whole tool, for everyone, for nine dollars.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
          <Pillar
            icon={<Barn className="w-12 h-12 text-brick" />}
            heading="A homepage, written for you"
            body="Tell us your farm's name, where you are, what you grow, and a sentence about why. We draft a beautiful one-page site — a welcome, your story, your share, your pickup. Edit anything. Publish in a click. Your own custom domain is included."
          />
          <Pillar
            icon={<Jar className="w-12 h-12 text-mossDark" />}
            heading="Members who order by texting back"
            body="No passwords for your neighbors, ever. They get one text on Tuesday: this week's share, with a window to swap, skip, gift, or pause. They reply. It's done. The forgotten-password tax is the largest hidden cost in farm-share software; we eliminate it."
          />
          <Pillar
            icon={<Wheat className="w-10 h-12 text-wheatDark" />}
            heading="Keep your own Stripe. Or don't."
            body="You already take payment somehow — Stripe, Square, Venmo, ACH, cash at pickup. Keep doing that. We never touch your money. If you'd rather we handled it end-to-end, we offer Managed Payments at a 1% platform fee. That is the entire upsell. There are no others."
          />
        </div>

        <div className="rule my-20 max-w-3xl mx-auto" />

        <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          <ProseFeature
            label="The pickup roster fits in your apron pocket"
            text="Open the app at the market. See who's coming today, whose share is packed, who hasn't shown. Long-press a name to text a no-show one tap. Mark sold-out from your phone — the web store updates the same second."
          />
          <ProseFeature
            label="Catch-weight billing that actually works"
            text="For meat farms: charge the deposit, butcher the animal, type in the hanging weight, and the balance auto-charges. The reconciliation pain that drove you off Barn2Door is just gone."
          />
          <ProseFeature
            label="A herd-share module, made for the laws of your state"
            text="Share certificates, monthly boarding-fee subscriptions, the boarding agreement signed at signup, the milk-test results broadcast to your members. Templates for Colorado, Idaho, Tennessee, Virginia, and seven other states are included, opened to the community."
          />
          <ProseFeature
            label="Posters, share cards, and a way to be found"
            text="Instagram-ready images of this week's share, posted in two taps. A printable QR-code poster for the farmers' market. A 'subscribe to our share' button you can drop onto your existing site. A referral mechanic that pays your members in farm credit."
          />
        </div>
      </section>

      {/* PRICE — the single line */}
      <section className="bg-soil text-parchment relative overflow-hidden">
        <div className="absolute inset-0 bg-grain opacity-30 pointer-events-none" />
        <div className="max-w-page mx-auto px-6 py-24 relative text-center">
          <div className="small-caps text-xs text-wheat mb-6">
            What it costs
          </div>
          <div className="display text-[7rem] md:text-[12rem] font-medium leading-[0.85] tracking-tight">
            $9<span className="text-wheat">.</span>
          </div>
          <div className="display text-2xl md:text-3xl mt-2 text-parchment/90 italic">
            per month. for every farm. for as long as we exist.
          </div>
          <div className="mt-10 max-w-2xl mx-auto text-lg text-parchment/75 leading-relaxed">
            No setup fee. No annual contract. No per-member, per-pickup,
            per-SKU, per-SMS, per-anything. No tiers. No "Enterprise." No
            data-export hostage. A 30-day free trial that does not ask for a
            card. One-click cancel that returns every byte of your data the
            same minute.
          </div>
          <div className="mt-10 inline-flex items-baseline gap-3 text-parchment/65">
            <span className="small-caps text-xs">Optional add-on</span>
            <span className="display text-lg">
              · Managed Payments: 1% on processed volume, only if you want it
            </span>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Link href="/join" className="btn bg-wheat text-soil border-wheat hover:bg-parchment hover:border-parchment">
              Join the early circle →
            </Link>
            <Link
              href="/homepage"
              className="btn border-parchment/40 text-parchment hover:bg-parchment hover:text-soil"
            >
              Try the AI homepage
            </Link>
          </div>
        </div>
      </section>

      {/* WHAT WE WON'T DO — explicit promise */}
      <section className="max-w-page mx-auto px-6 py-24">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div className="small-caps text-xs text-brick mb-3">
              Our promise to the farms
            </div>
            <h2 className="display text-4xl md:text-5xl font-medium leading-[1.05]">
              What Communicare will never become.
            </h2>
            <p className="mt-6 text-soil/75 leading-relaxed text-lg">
              We will not be tempted by the things software companies are
              tempted by. Below is the list, written down so we cannot pretend
              we never said it.
            </p>
          </div>
          <div className="md:col-span-7">
            <ul className="space-y-5 text-lg">
              {[
                "We will never charge a setup fee.",
                "We will never take a percentage of your sales unless you specifically ask us to handle payments end-to-end.",
                "We will never lock your data behind a contract or a cancellation form.",
                "We will never hide our pricing behind a 'book a demo' button.",
                "We will never charge per member, per pickup site, per product, or per SMS message.",
                "We will never sell a 'Pro' tier, an 'Enterprise' tier, or any tier at all.",
                "We will never sell your customer data, target your members with ads, or train a model on your farm's life.",
                "We will never become the thing we were built to replace.",
              ].map((line, i) => (
                <li
                  key={i}
                  className="flex gap-4 pb-5 border-b border-soil/10 last:border-0 last:pb-0"
                >
                  <span className="display text-wheat text-2xl leading-none mt-0.5">
                    ※
                  </span>
                  <span className="text-soil/85">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SAMPLE FARMS — discovery preview */}
      <section className="border-t border-soil/15 bg-cream">
        <div className="max-w-page mx-auto px-6 py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <div className="small-caps text-xs text-brick mb-3">
                What the homepage looks like, once written
              </div>
              <h2 className="display text-4xl md:text-5xl font-medium leading-tight">
                A few farms,
                <br />
                drawn from life.
              </h2>
            </div>
            <p className="md:max-w-md text-soil/70 italic">
              A national farm-share map will come — last, only when there are
              enough of you to make a map worth opening. For now, these are
              sketches.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {sampleFarms.slice(0, 3).map((farm) => (
              <Link
                key={farm.slug}
                href={`/farm/${farm.slug}`}
                className="paper p-7 hover:-translate-y-1 transition-transform group block"
              >
                <div className="flex items-center justify-between mb-5">
                  <FarmIcon kind={farm.kind} />
                  <span className="small-caps text-[10px] text-soil/50">
                    {farm.kind}
                  </span>
                </div>
                <h3 className="display text-2xl font-medium mb-1 group-hover:text-brick transition-colors">
                  {farm.name}
                </h3>
                <div className="text-sm text-soil/60 mb-4">
                  {farm.location}
                </div>
                <p className="text-soil/80 leading-relaxed mb-5">
                  {farm.tagline}
                </p>
                <div className="text-sm display italic text-brick">
                  See the homepage →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className="max-w-page mx-auto px-6 py-28 text-center">
        <Sun className="w-16 h-16 text-wheat mx-auto mb-8" />
        <h2 className="display text-4xl md:text-5xl font-medium max-w-3xl mx-auto leading-tight">
          If you keep a farm, we would like to make this for you.
        </h2>
        <p className="mt-6 max-w-xl mx-auto text-lg text-soil/75 italic">
          Tell us your farm's name and a way to reach you. We will email when
          we are ready to receive your share.
        </p>
        <div className="mt-10">
          <Link href="/join" className="btn btn-primary">
            Join the early circle →
          </Link>
        </div>
        <div className="ornament mt-20 max-w-md mx-auto">❦ ◊ ❦</div>
      </section>
    </>
  );
}

function Pillar({
  icon,
  heading,
  body,
}: {
  icon: React.ReactNode;
  heading: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-6">{icon}</div>
      <h3 className="display text-2xl font-medium mb-3 leading-tight">
        {heading}
      </h3>
      <p className="text-soil/80 leading-relaxed">{body}</p>
    </div>
  );
}

function ProseFeature({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-2 border-wheat pl-6">
      <h4 className="display text-xl font-medium mb-2">{label}</h4>
      <p className="text-soil/80 leading-relaxed">{text}</p>
    </div>
  );
}

function FarmIcon({ kind }: { kind: string }) {
  if (kind === "Raw milk herd share")
    return <Jar className="w-10 h-12 text-brick" />;
  if (kind === "Pastured meat") return <Barn className="w-12 h-10 text-brick" />;
  if (kind === "Vegetable CSA")
    return <Leaf className="w-11 h-11 text-mossDark" />;
  return <Wheat className="w-9 h-12 text-wheatDark" />;
}
