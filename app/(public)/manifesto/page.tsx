import type { Metadata } from "next";
import Link from "next/link";
import { Sun } from "@/components/mark";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, SITE_NAME, CROS_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why we built Communicare — A manifesto",
  description:
    "What we owe the small farms that feed us, the software that's failed them, and what we promise never to do.",
  alternates: { canonical: "/manifesto" },
  openGraph: {
    title: "On the small farm — A manifesto",
    description:
      "What we owe the people who feed us, and what we promise never to do.",
    url: "/manifesto",
    type: "article",
  },
};

const MANIFESTO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "On the small farm",
  description:
    "What we owe the small farms that feed us, the software that's failed them, and what we promise never to do.",
  url: `${SITE_URL}/manifesto/`,
  publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  inLanguage: "en-US",
  about: ["Small farms", "CSA", "Agrarianism", "Farm-share software"],
};

export default function ManifestoPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-20 md:py-28">
      <JsonLd data={MANIFESTO_JSON_LD} />
      <div className="text-center mb-14">
        <Sun className="w-14 h-14 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">An open letter</div>
        <h1 className="display text-5xl md:text-6xl font-medium leading-[1.05]">
          On the small farm.
        </h1>
        <div className="display italic text-soil/60 mt-6 text-lg">
          and what we owe the people who feed us
        </div>
      </div>

      <div className="ornament mb-12">❦</div>

      <div className="prose-content space-y-7 text-[1.18rem] leading-[1.75] text-soil/85">
        <p className="drop-cap">
          There is a kind of work the modern world has forgotten how to honor.
          It happens before dawn, on land somebody&apos;s grandfather cleared,
          in a kitchen where the books are kept by hand, in a barn where the
          same cow has been milked for nine years by the same two hands. The
          people who do it feed the rest of us, for wages that would shame a
          software engineer.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          What software has done to them
        </h2>
        <p>
          The state of farm-share software in 2026 is a small embarrassment.
          The biggest product charges three hundred dollars to set up and
          ninety-nine a month after, plus a cut of every transaction, sold by
          phone after a forty-five-minute demo. The largest competitor went
          under in December and left a hundred and fifty farms homeless in the
          middle of their planning season. These tools are not made for farms.
          They are made for the investor decks of the people who sell to
          farms.
        </p>
        <p>
          We set out to embarrass that. Nine dollars a month. Monthly
          contract. The data is yours. Setup takes ten minutes, by yourself,
          without a demo. No upsell.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          A tool, not a platform
        </h2>
        <p>
          A platform puts itself between you and your neighbor and takes a cut
          of every passing thing. A tool sits in your hand. You pick it up
          when you need it and put it down when you don&apos;t. A hoe is a
          tool. An apron is a tool. Communicare is a tool. A platform wants
          growth; a tool wants to be good. We chose, deliberately, to build a
          tool.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          On the price
        </h2>
        <p>
          Nine dollars is what it costs to run the software for one small
          farm. The cost for ten thousand small farms is still small. There is
          no reason for the price to be higher except to enrich the people who
          own the company, and we have decided to forgo that — the founders
          take a modest, honest wage from this and never more.
        </p>
        <p>
          The only other way we make money is a one percent fee for farms who
          let us handle payments through Stripe Connect on their behalf. No
          ads. No sponsored placements on a farm&apos;s page. No sale of
          customer data. Ever. If we betray this, the people who paid us nine
          dollars should feel betrayed, and they should leave.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          On the family this belongs to
        </h2>
        <p>
          Communicare is one of a small family of tools called{" "}
          <a
            href={CROS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brick hover:underline"
          >
            CROS
          </a>
          , built by the same hands, at the same modest pace. Each tool is made
          for a piece of the work that holds people together — food, care, the
          neighborhoods that make both possible. There is no growth target,
          no roadmap of features designed to raise a round, no plan to be
          acquired. There is a small number of us, working slowly, on tools
          we ourselves use.
        </p>
        <p>
          If Communicare is not the tool for you, one of the others might be —
          or the next one we build might be. You can watch the family
          grow at{" "}
          <a
            href={CROS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brick hover:underline"
          >
            thecros.app
          </a>
          . Every one of them will be made this way: quiet, small, honest
          about what it is.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          On the homepage we draft for you
        </h2>
        <p>
          We use a writing machine to draft the first version of every
          farm&apos;s homepage. Most of the farmers we&apos;ve spoken to have
          never had a designer, don&apos;t want one, and have been beaten down
          by website builders that ask forty-three questions before showing
          anything. A blank page is a tax on people who already work too many
          hours.
        </p>
        <p>
          The machine doesn&apos;t know your farm. It doesn&apos;t know your
          daughter&apos;s name, the cow that broke its leg, the field that
          grows the best cabbage. It gives you a starting place — a competent,
          un-embarrassing first draft. After that, you write your farm: about
          the creek, the year of the drought, why you came home. The machine
          is a scaffold. You are the building.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-10">
          What we ask of you
        </h2>
        <p>
          Bring your farm here, if you have one, and tell your neighbors. Tell
          us when something is broken, and when we have grown into something
          we promised not to be. Send the farmer-neighbors who still keep
          their books in a binder, the ones who quit Barn2Door last fall, the
          ones running a herd share and waiting for someone to write software
          with their state&apos;s regulations in mind. Remember, when you eat
          what they grew, what it cost them to grow it.
        </p>

        <div className="mt-14 border-y border-soil/15 py-10 bg-cream2/40 -mx-4 px-6">
          <p className="display text-2xl md:text-3xl leading-snug text-soil text-center font-medium">
            HelloFresh extracted value from the relationship between farms and
            the people they feed.
            <br />
            <span className="text-brick">
              Communicare hands that relationship back.
            </span>
          </p>
        </div>

        <p className="display italic text-2xl text-brick text-center mt-12">
          Nine dollars a month. No tiers. No tricks. Forever.
        </p>
      </div>

      <div className="ornament mt-16">❦ ◊ ❦</div>

      <div className="text-center mt-12">
        <Link href="/farmer/sign-up" className="btn btn-primary">
          Start your farm →
        </Link>
      </div>

      <div className="mt-20 text-xs text-soil/45 text-center italic max-w-xl mx-auto leading-relaxed">
        Communicare derives from the Latin <em>communis</em> — common. To
        commune, to share, to take part in. We thought it was the right word
        for a tool meant for the people who set the country&apos;s tables.
      </div>
    </article>
  );
}
