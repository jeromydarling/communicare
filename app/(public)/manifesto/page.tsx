import type { Metadata } from "next";
import Link from "next/link";
import { Wheat, Sun } from "@/components/mark";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Why we built Communicare — A manifesto",
  description:
    "An open letter on the dignity of small farms, the duty of software made for them, and what we promise never to do.",
  alternates: { canonical: "/manifesto" },
  openGraph: {
    title: "On the dignity of small farms — A manifesto",
    description:
      "What we owe the people who feed us, and what we promise never to do.",
    url: "/manifesto",
    type: "article",
  },
};

const MANIFESTO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "On the dignity of small farms",
  description:
    "An open letter on the dignity of small farms, the duty of software made for them, and what we promise never to do.",
  url: `${SITE_URL}/manifesto/`,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  inLanguage: "en-US",
  about: ["Small farms", "CSA", "Catholic Worker", "Wendell Berry", "Agrarianism"],
};

export default function ManifestoPage() {
  return (
    <article className="max-w-3xl mx-auto px-6 py-20 md:py-28">
      <JsonLd data={MANIFESTO_JSON_LD} />
      <div className="text-center mb-16">
        <Sun className="w-14 h-14 text-wheat mx-auto mb-6" />
        <div className="small-caps text-xs text-brick mb-4">
          An open letter, in the style of an old encyclical
        </div>
        <h1 className="display text-5xl md:text-6xl font-medium leading-[1.05]">
          On the dignity
          <br />
          of small farms.
        </h1>
        <div className="display italic text-soil/60 mt-6 text-lg">
          and what we owe the people who feed us
        </div>
      </div>

      <div className="ornament mb-12">❦</div>

      <div className="prose-content space-y-7 text-[1.18rem] leading-[1.75] text-soil/85">
        <p className="drop-cap">
          There is a kind of labor the modern world has lost the language to
          honor. It does not happen in offices. It does not happen on screens.
          It happens before dawn and after dusk, on land somebody's grandfather
          cleared, in a kitchen where the books are kept by hand, in a barn
          where the same cow has been milked for nine years by the same two
          hands. The people who do this work feed the rest of us, and they do
          it for wages that would shame a software engineer.
        </p>

        <p>
          When Pope Leo XIII wrote{" "}
          <em>Rerum Novarum</em> in the spring of 1891 — on the rights of
          working people, against the cruelty of unrestrained capital and
          against the false promises of unrestrained collectivism — he was not
          thinking of farm shares in twenty-first-century America. But the
          ground he stood on is the same ground we are standing on now. The
          dignity of labor. The family as the foundation of common life. The
          duty of those with power to protect, and not to grind down, the
          voluntary associations of working people. A just price for honest
          work. The land as something held in stewardship, not exploited as
          property.
        </p>

        <p>
          We are not a Catholic project, and Communicare is not a religious
          undertaking. But we have read the old documents, and we have noticed
          that they say more clearly than anything written in our century what
          we believe about the small farm: that it is not a unit of economic
          output, that it is not a content channel, that it is not a market
          to be addressed. It is a household, a piece of land, a vocation, and
          a place where neighbors meet.
        </p>

        <hr className="rule my-12" />

        <h2 className="display text-3xl font-medium text-soil mt-12">
          What software has done to the small farm
        </h2>
        <p>
          The state of farm-share software, in the year of our Lord
          twenty-twenty-six, is a small embarrassment. The most-promoted
          product in the category charges three hundred dollars to set up and
          ninety-nine a month forward, plus a percentage of every transaction.
          It is sold by phone after a forty-five-minute demo. It locks the
          farm's data behind a thirty-day notice. The largest competitor,
          which served a hundred and fifty farms last winter, simply shut
          down in December and left its customers homeless in the middle of
          their planning season.
        </p>
        <p>
          These tools are not made <em>for</em> farms. They are made for the
          investor decks of the people who sell to farms. We believe this is
          shameful, and we have set out to embarrass it. The price is nine
          dollars. The contract is monthly. The data is yours. The setup is
          ten minutes, by yourself, without a demo. There is no upsell.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-12">
          What we believe a small tool is for
        </h2>
        <p>
          A tool is not the same kind of thing as a platform. A platform
          intermediates. It places itself between you and your neighbor and
          takes a cut of every passing thing. A tool sits in your hand. You
          pick it up when you need it and put it down when you don't. A hoe is
          a tool. A spreadsheet is a tool. An apron is a tool. Communicare is
          a tool.
        </p>
        <p>
          The difference matters. A platform is paid more the more it can
          insert itself. A tool is paid the same whether you use it once a
          week or once an hour. A platform wants growth. A tool wants to be
          good. We chose, deliberately, to build a tool.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-12">
          On the price
        </h2>
        <p>
          Nine dollars a month is not a marketing strategy. It is what the
          tool is worth. The cost to operate the software for one small farm
          is small; the cost to operate it for ten thousand small farms is
          still small. There is no reason for the price to be high except to
          enrich the people who own the company, and we have decided to forgo
          that enrichment. We have set up the business so that the founders
          may earn a modest, honest wage from it — and never more than that.
        </p>
        <p>
          For the small share of farms who want us to handle the payments
          themselves — to set up Stripe Connect, to handle disputes, to issue
          1099s — we charge a one percent platform fee. This is the entire
          way we make money beyond the nine dollars. There are no other
          revenue streams. There will never be advertisements. There will
          never be a sponsored placement on a farm's page. There will never
          be a sale of customer data. If we ever betray this, the people who
          paid us nine dollars should feel betrayed, and they should leave.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-12">
          On the discovery map
        </h2>
        <p>
          We have promised that one day there will be a national map of every
          farm share in the country — a way for a new customer in any town to
          find a real farmer nearby, see what is growing, and pay for a
          share. This is the last thing we will build. The reason is simple:
          there is no point in a map of empty places. We will build the map
          when there are enough farms on Communicare for it to be honest. The
          existing maps — LocalHarvest, Eatwild, the USDA directory — are
          stale, often listing farms that closed years ago, and they cannot
          tell you whether the farm has shares left for the season. We can do
          better, but we will not pretend to do it before we can.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-12">
          On the homepage we generate for you
        </h2>
        <p>
          We use a large language model, Anthropic's Claude, to draft the
          first version of every farm's homepage. We do this because most of
          the farmers we have spoken to have never had a designer, do not
          want one, and have been beaten down by website builders that ask
          forty-three questions before showing anything. A blank page is a
          tax on people who already work too many hours.
        </p>
        <p>
          But we want to be clear about what this is and what it is not. The
          AI does not know your farm. It does not know your daughter's name,
          or the cow that broke its leg, or the field that grows the best
          cabbage. It can give you a starting place — a competent, warm, and
          un-embarrassing first draft. After that, you write your farm. You
          tell us about the creek, about the year of the drought, about why
          you came home. The AI is a scaffold. You are the building.
        </p>

        <h2 className="display text-3xl font-medium text-soil mt-12">
          What we ask of you
        </h2>
        <p>
          That you bring your farm here, if you have one, and tell your
          neighbors. That you tell us when something is broken, and when we
          have grown into something we promised not to be. That you send your
          farmer-neighbors our way, especially the ones still keeping
          spreadsheets in a binder, and the ones who quit Barn2Door last
          fall, and the ones who run a herd share and have been waiting for
          someone, anyone, to write software with their state's regulations
          in mind. That you remember, when you eat what they grew, what it
          cost them to grow it.
        </p>
        <p>
          We will not get this right immediately. We are two people working
          out of a kitchen, with the help of an AI that we are honest about
          using. But we have read the old books, and we have decided to take
          them at their word: that the labor of feeding one another is sacred
          work, and that those of us who build the tools for that labor have
          a duty to build them in a spirit of service and not of extraction.
          Nine dollars a month. No tiers. No tricks. Forever.
        </p>

        <div className="mt-16 border-y border-soil/15 py-10 bg-cream2/40 -mx-4 px-6">
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
          Pax tibi. Welcome.
        </p>
      </div>

      <div className="ornament mt-16">❦ ◊ ❦</div>

      <div className="text-center mt-16">
        <Link href="/join" className="btn btn-primary">
          Join the early circle →
        </Link>
      </div>

      <div className="mt-20 text-xs text-soil/45 text-center italic max-w-xl mx-auto leading-relaxed">
        Communicare derives from the Latin <em>communis</em>, meaning common —
        to commune, to share, to take part in. The same root gives us
        community, communion, and the Eucharistic verb itself: to make a
        common thing of what was once held alone. We thought it was the right
        word for a tool meant for the people who set the country's tables.
      </div>
    </article>
  );
}
