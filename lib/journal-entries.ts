// Sample journal entries per farm. The journal is a public-facing
// long-form newsletter — the kind of thing a farm might write four or five
// times a season. Voice should match communicare-voice/SKILL.md.

export type JournalEntry = {
  slug: string;
  farmSlug: string;
  title: string;
  excerpt: string;
  body: string[]; // paragraphs
  publishedOn: string; // ISO
  category: "field" | "kitchen" | "herd" | "letter";
  readMinutes: number;
};

export const journalEntries: JournalEntry[] = [
  // Elmwood
  {
    slug: "the-spring-the-creek-took-the-onion-bed",
    farmSlug: "elmwood",
    title: "The spring the creek took the onion bed.",
    excerpt:
      "Federal Creek crested twice the week of April 18. We lost a thousand onion starts and learned, again, that the lowest bed belongs to the water.",
    body: [
      "Federal Creek crested twice the week of April 18. The first crest, on a Tuesday, took the lower row of strawberries — about twenty plants, none yet bearing. We knew this would happen because it has happened every April since we moved here. We did not plant anything in that row this year that we could not afford to lose.",
      "The second crest came on a Thursday and took the onion bed. This we had not planned for. About a thousand starts — Newburg, Patterson, Red Wing, and the Walla Wallas Lucia wanted to grow because she liked the name. The water sat in the bed for nineteen hours and by Sunday it was clear the onions were not coming back.",
      "We replanted on Tuesday with starts borrowed from a neighbor — the same Newburgs, mostly, plus a flat of Cabernet shallots she pressed on us because she said we looked tired. The shallots will be a small addition to your share in August. Consider them a gift from a woman named Doreen who lives two miles south of us.",
      "The onion bed is moved this year. Higher ground. The strawberries we will plant again next spring in the same row, because the strawberries cost us nothing and the row gets the morning sun.",
    ],
    publishedOn: "2026-05-04",
    category: "field",
    readMinutes: 3,
  },
  {
    slug: "on-the-uses-of-garlic-scapes",
    farmSlug: "elmwood",
    title: "On the uses of garlic scapes.",
    excerpt:
      "Most members ask what they are. Here is what they are, why we cut them, and three things to do with them that are better than throwing them out.",
    body: [
      "Garlic scapes are the curled flower stalks of hardneck garlic. We cut them in late May to send the plant's energy back down into the bulb. The bulbs you'll get in July will be twice the size for it.",
      "Most members open their share and ask what they are. A few cook them once and never again. We are sympathetic; they are stranger than they look. But the next time you have a bunch in your share, try one of these three:",
      "1. Garlic scape pesto. Two cups of scapes, half a cup of parmesan, a half cup of olive oil, a small handful of toasted walnuts, salt. Process. Keeps a week. Better on toast than basil pesto, in our opinion.",
      "2. Pickled, in a hot brine. They will be ready in three days and will keep two months. Slice them into salads, or eat them straight from the jar over the kitchen sink, which is what we do.",
      "3. Grilled whole. Brush with olive oil, salt heavily, grill until charred. Eat with grilled meat. The texture goes mild and almost sweet.",
      "If you have a fourth way — write us. We will publish it.",
    ],
    publishedOn: "2026-05-22",
    category: "kitchen",
    readMinutes: 2,
  },
  {
    slug: "a-letter-to-our-new-members",
    farmSlug: "elmwood",
    title: "A letter to our new members.",
    excerpt:
      "We add a few new members each season. Here is what you should know about us, the farm, and the shape of what's coming for the next twenty-two weeks.",
    body: [
      "Welcome, and thank you. We are Rosa and Jakub Sandoval, and the small farm you have subscribed to is called Elmwood. Our daughter Lucia, seven and tall for her age, is the third member of the operation; she gets paid a small wage and the right to plant whatever she wants in the corner field, which this year is going to be sunflowers and three rows of carrots in the wrong variety.",
      "Your share will come twenty-two weeks in a row, from the third week of May to the third week of October. The first few weeks are heavy on greens — kale, lettuce, asian greens — because that is what is ready early. By July there will be tomatoes, and by August there will be too many tomatoes. We apologize in advance.",
      "On Saturday afternoon we will text you what is in your share for the coming Tuesday. You have until Monday at six in the evening to swap any two items for two others, skip the week, donate to the food bank, or gift the share to a friend. You do this by replying to the text. You do not need to log into anything. We promise.",
      "When something goes wrong — and it will, because farms are like that — we will tell you what happened. The flood took the onions. The deer found the lettuce. The hail bruised the cabbages. We try not to pretend that food appears.",
      "Welcome. We will see you Tuesday.",
    ],
    publishedOn: "2026-05-12",
    category: "letter",
    readMinutes: 4,
  },
  // Three Forks
  {
    slug: "june-milk-test-results",
    farmSlug: "three-forks",
    title: "June milk test results — all clear.",
    excerpt:
      "Coliforms below detection, standard plate count 1,200 CFU/mL. The herd is happy, the pasture is finally up, and Wren had a heifer calf on the morning of May 31.",
    body: [
      "The CSU extension lab returned our June samples yesterday. Standard plate count: 1,200 CFU/mL (the legal ceiling for raw milk in Colorado is 15,000; the FDA's pasteurized standard is 100,000). Coliforms: below detection. We are pleased.",
      "Pasture is finally up at 9,000 feet. The cows are off hay for the season and on rotated grass; you'll taste the difference in this month's milk — sweeter, with the slight grassy note that comes when the Jerseys are eating spring growth. June's cream is also the highest in butterfat of the year.",
      "Wren delivered a heifer calf on the morning of May 31. Mother and daughter are both well. The new calf is solid black except for a small white patch on her forehead shaped, depending on your imagination, like the state of Colorado or a small lentil. Lucia (eight, child of one of our shareholders) suggested we name her June and we agreed because we have not had a June.",
      "Next milk test is scheduled for the second week of July.",
    ],
    publishedOn: "2026-06-05",
    category: "herd",
    readMinutes: 2,
  },
  // Low Creek
  {
    slug: "what-hanging-weight-means",
    farmSlug: "low-creek",
    title: "What hanging weight means.",
    excerpt:
      "We sell beef by hanging weight, like every small farm in the country. Here is what that means, why it works that way, and how to read the cut sheet we'll email you in November.",
    body: [
      "Hanging weight is the carcass weight after the head, hide, and offal are removed but before the butcher trims the carcass into individual cuts. It is the most honest way to price a beef share because it is what the butcher actually weighs.",
      "A quarter beef from us is typically 150 to 170 pounds of hanging weight. You'll get back approximately sixty to sixty-five percent of that as packaged, freezer-ready meat — so figure ninety to a hundred and ten pounds in your freezer. The difference is bone, fat, and trim. (If you ask, the butcher will save you the bones and the suet for free; just write it on the cut sheet.)",
      "Speaking of the cut sheet: we email it to you the week after the steer goes to the butcher. It is two pages and looks intimidating. The important boxes are: how thick you want the steaks (one inch is standard), what size roasts you want (three pounds is a good Sunday size), and whether you want the ground beef in one-pound or two-pound packages. The rest you can leave at the defaults. We have done this enough times to know what most people are happy with.",
      "Final question: when do you want the meat? We will text you the moment it's ready. You have a week to pick up; we have a chest freezer for stragglers.",
    ],
    publishedOn: "2026-06-12",
    category: "field",
    readMinutes: 3,
  },
];

export function entriesForFarm(slug: string): JournalEntry[] {
  return journalEntries
    .filter((e) => e.farmSlug === slug)
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn));
}

export function entryForFarm(
  farmSlug: string,
  entrySlug: string,
): JournalEntry | undefined {
  return journalEntries.find(
    (e) => e.farmSlug === farmSlug && e.slug === entrySlug,
  );
}
