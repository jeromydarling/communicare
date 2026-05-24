export type SampleFarm = {
  slug: string;
  name: string;
  location: string;
  kind:
    | "Vegetable CSA"
    | "Raw milk herd share"
    | "Pastured meat"
    | "Mixed farm";
  tagline: string;
  founder: string;
  founderBio: string;
  story: string;
  callouts: { label: string; body: string }[];
  share: {
    name: string;
    cadence: string;
    price: string;
    includes: string[];
  };
  pickup: { place: string; day: string; window: string }[];
  faq: { q: string; a: string }[];
};

export const sampleFarms: SampleFarm[] = [
  {
    slug: "elmwood",
    name: "Elmwood Farm",
    location: "Athens County, Ohio",
    kind: "Vegetable CSA",
    tagline:
      "Six acres of vegetables, two beds of cut flowers, a creek that floods every March.",
    founder: "Rosa & Jakub Sandoval",
    founderBio:
      "We bought the farm with no farming experience and a baby in October of 2018. We are still learning.",
    story:
      "Elmwood is six acres on the southern slope above Federal Creek. We grow about forty crops over the season — heavy on the alliums and the brassicas, light on the things deer prefer. We have one paid hand, our daughter Lucia, and her wage is split between cash and the right to choose what we plant in the corner field. We do not till. We mulch with leaves the township drops off in November.",
    callouts: [
      {
        label: "Twenty-two weeks of vegetables",
        body: "First share around the third week of May, last share around the third week of October. We deliver what is best each week, not what you ordered last spring.",
      },
      {
        label: "Choose your own share, by text",
        body: "Every Saturday we send you what's in your box. You have until Monday at six to swap any two items for two others. Reply DONATE and we send your share to the food pantry instead.",
      },
      {
        label: "Pay how you'd like",
        body: "Full season up front gets you a free flower bouquet every week of August. Monthly installments are welcome and how most of our members pay.",
      },
    ],
    share: {
      name: "The standard share",
      cadence: "Weekly · 22 weeks",
      price: "$620 for the season, or $36 weekly",
      includes: [
        "7–10 items each week",
        "A weekly newsletter with one recipe",
        "Pick-your-own herbs and cherry tomatoes through August",
        "First right of refusal on next year's share",
      ],
    },
    pickup: [
      { place: "The farm, Athens OH", day: "Tuesday", window: "3:00 – 7:00pm" },
      { place: "Donkey Coffee, Court St.", day: "Wednesday", window: "8:00am – 12:00pm" },
      { place: "Nelsonville library", day: "Wednesday", window: "4:00 – 6:30pm" },
    ],
    faq: [
      {
        q: "What happens if I'm going to be away?",
        a: "Reply PAUSE to your Tuesday text. We pause your share for as many weeks as you tell us, and credit your account for those weeks. Or give it to a neighbor — reply GIFT and a name.",
      },
      {
        q: "Do you spray?",
        a: "We use OMRI-listed sprays for cabbage moth and squash bug, occasionally. Otherwise no. We are not certified organic — the paperwork is more than we can carry — but we'd be happy to walk you through everything we use.",
      },
      {
        q: "Can I bring my children?",
        a: "Please. We have a sandbox, a friendly dog, and tomatoes you may eat off the vine.",
      },
    ],
  },
  {
    slug: "three-forks",
    name: "Three Forks Dairy",
    location: "Park County, Colorado",
    kind: "Raw milk herd share",
    tagline:
      "Twelve Jersey cows, grass-fed at 9,000 feet, milked by hand twice a day.",
    founder: "Mary Hoffmeier",
    founderBio:
      "Third-generation rancher. I came home in 2014 after a decade in Denver. The cows convinced me to stay.",
    story:
      "Three Forks sits in the South Park basin, where the South, Middle, and North forks of the South Platte come together. We keep a small herd of Jersey cows — Daisy, Pearl, Maggie, Buttercup, Ada, Vera, Hazel, Iris, Lucy, Annie, Wren, and June — on rotated pasture from May through October, and on local grass hay through the winter. Our members own a fractional share of the herd. State law in Colorado requires monthly milk testing; results are posted here and texted to every shareholder.",
    callouts: [
      {
        label: "One share, two gallons a week",
        body: "A 1/30th share entitles you to two gallons of raw milk each week, year-round. You may collect more or less in any given week; we keep a running balance.",
      },
      {
        label: "A boarding fee, not a milk price",
        body: "By Colorado law we do not sell raw milk. You pay a monthly boarding fee — $115 — for the labor of caring for your portion of the herd: feeding, milking, vet care, pasture.",
      },
      {
        label: "Tested monthly, transparently",
        body: "Standard plate count and coliform results are posted by the 5th of every month. We use the Colorado State University extension lab.",
      },
    ],
    share: {
      name: "1/30th cow share",
      cadence: "Year-round membership",
      price: "$220 share purchase, $115/month boarding",
      includes: [
        "2 gallons of milk per week, by allotment",
        "First option on cream, butter, and yogurt at cost",
        "Annual herd visit & pasture walk",
        "Right to be present at calving (with notice)",
      ],
    },
    pickup: [
      { place: "The dairy, Fairplay CO", day: "Saturday", window: "8:00 – 11:00am" },
      { place: "Bailey, Park County Library", day: "Wednesday", window: "4:00 – 6:00pm" },
    ],
    faq: [
      {
        q: "Is raw milk legal in Colorado?",
        a: "The sale of raw milk is not legal in Colorado. Herd shares — private contracts in which you own a fractional interest in the cow — are. Your share purchase makes you a co-owner. You are not buying milk; you are consuming milk from an animal you partially own.",
      },
      {
        q: "What if I can't make it to pickup?",
        a: "We hold your allotment for two weeks. After that it goes to the staff or, with your permission, to a neighbor on the waiting list.",
      },
      {
        q: "Can I visit the cows?",
        a: "Yes. Saturday mornings during pickup, anytime by arrangement. The cows will remember you faster than you'll remember them.",
      },
    ],
  },
  {
    slug: "low-creek",
    name: "Low Creek Ranch",
    location: "Lewis County, Tennessee",
    kind: "Pastured meat",
    tagline:
      "Grass-fed beef, pastured pork, woodland chicken — raised the way our grandparents would recognize.",
    founder: "Daniel & Naomi Walker",
    founderBio:
      "Quit teaching to come home to my grandfather's land. Naomi runs the kitchen, the books, and most of the chickens.",
    story:
      "Two hundred and twelve acres on a quiet bend of Low Creek, half in pasture, half in hardwood. We rotate cattle daily across the open ground, follow them with laying hens to scratch the manure into the field, and run the hogs through the woods to clear understory and finish on acorns in the fall. Nothing here gets corn or soy. We process at a state-inspected facility forty minutes north.",
    callouts: [
      {
        label: "Quarter, half, or whole beef",
        body: "Reserve in February. The cattle finish in November. You'll get a butcher cut-sheet by email, and we'll auto-charge the balance based on actual hanging weight.",
      },
      {
        label: "A monthly meat share",
        body: "For those who don't want to fill a chest freezer all at once: $90 a month, a mixed box of cuts, delivered to one of seven Tennessee drop sites.",
      },
      {
        label: "Eggs while supplies last",
        body: "Forty dozen a week, give or take. First reply to the Friday text gets a dozen; we'll text you back if we ran out.",
      },
    ],
    share: {
      name: "Quarter Beef",
      cadence: "Once a year · November",
      price: "$5.95/lb hanging weight (typically $1,000–$1,250 total)",
      includes: [
        "Approximately 90–110 lbs of cut meat",
        "Your choice of cuts on the butcher form",
        "Bones, organ meats, and suet on request",
        "First option on next year's reservation",
      ],
    },
    pickup: [
      { place: "The ranch, Hohenwald TN", day: "Saturday", window: "9:00am – 1:00pm" },
      { place: "East Nashville, Five Points", day: "First Sunday", window: "11:00am – 1:00pm" },
    ],
    faq: [
      {
        q: "Why hanging weight?",
        a: "Hanging weight is the carcass weight after the head, hide, and offal are removed but before the butcher trims it into cuts. It's how every small farm in the country prices a beef share. You'll get roughly 60–65% of hanging weight back as packaged meat.",
      },
      {
        q: "Can I visit?",
        a: "Yes — we have a farm day every May. Bring children, dogs, and walking shoes. There's a pond.",
      },
      {
        q: "Do you ship?",
        a: "No. We're a small operation and shipping frozen meat well takes infrastructure we don't have. The drop sites are how we serve people outside Lewis County.",
      },
    ],
  },
  {
    slug: "morning-glory",
    name: "Morning Glory Gardens",
    location: "Western Sonoma, California",
    kind: "Vegetable CSA",
    tagline: "A market garden tended by two women and a borrowed mule.",
    founder: "Lila Tanaka & Frances Park",
    founderBio:
      "Met at horticulture school in 2019. Lease the land from an elderly neighbor in exchange for half the lettuce.",
    story:
      "Two acres, no-till, hand-worked. We grow forty crops for fifty members, and we sell the surplus at the Saturday market in Sebastopol. The land was a Christmas tree farm; we are slowly bringing the soil back. Our 'mule' is a 1956 Allis-Chalmers that Frances inherited and Lila refuses to learn to drive.",
    callouts: [
      {
        label: "Twenty-eight weeks, May to November",
        body: "Long season, mild winters, a lot of variety. Expect a lot of greens in May and a lot of tomatoes in September.",
      },
      {
        label: "Half-shares welcome",
        body: "If a full share is too much vegetable, split one with a neighbor. We'll text both of you separately each week.",
      },
      {
        label: "Pick-your-own flowers",
        body: "Every Friday afternoon at the farm. Bring scissors and a jar.",
      },
    ],
    share: {
      name: "Half share",
      cadence: "Weekly · 28 weeks",
      price: "$420 for the season",
      includes: [
        "5–7 items each week",
        "Pick-your-own flowers Fridays",
        "Open farm Sundays in July",
      ],
    },
    pickup: [
      { place: "Farm, Sebastopol CA", day: "Friday", window: "2:00 – 6:00pm" },
      { place: "Petaluma, Pongo's Kitchen", day: "Saturday", window: "9:00am – 12:00pm" },
    ],
    faq: [
      {
        q: "Are you certified organic?",
        a: "No. We farm to a standard that exceeds organic, but the certification cost is not worth it at our scale. We'd rather you visit and see.",
      },
      {
        q: "Can my CSA be SNAP-eligible?",
        a: "Yes, starting in 2026. We're working on it.",
      },
    ],
  },
];

export function getFarm(slug: string) {
  return sampleFarms.find((f) => f.slug === slug);
}
