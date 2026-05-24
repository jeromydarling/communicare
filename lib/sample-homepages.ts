import type { GeneratedHomepage } from "./homepage-schema";

// These are pre-baked outputs that the static demo serves so visitors can see
// what the AI generator produces. In the self-hosted version (run locally
// with an ANTHROPIC_API_KEY), the real route at /api/generate-homepage calls
// Claude Opus 4.7 to draft a homepage uniquely for each farm.

type SampleKey =
  | "Vegetable CSA"
  | "Raw milk herd share"
  | "Pastured meat"
  | "Pastured eggs"
  | "Mixed farm"
  | "Market garden"
  | "Orchard / fruit share"
  | "Flower farm";

export const sampleGenerated: Record<SampleKey, GeneratedHomepage> = {
  "Mixed farm": {
    heroHeadline: "A hundred acres, kept by two of us.",
    tagline:
      "Vegetables and dairy and laying hens on a piece of Floyd County hill country that's been farmed since before Virginia was a state.",
    about:
      "Hannah and Ben bought this place in 2017 with money borrowed from Hannah's father. The barn is older than the country. They keep five Jersey cows on rotated pasture, forty laying hens following behind, an old fruit orchard, and a vegetable plot that's grown a little every year. They don't till. They don't spray. They have made every mistake there is to make, and they keep coming back to the work.",
    callouts: [
      {
        label: "Vegetables, year-round",
        body: "Forty crops in summer, twenty in winter under low tunnels. The share follows the season — heavy on greens in May, on tomatoes in August, on root vegetables in January.",
      },
      {
        label: "A herd-share for the milk",
        body: "Virginia raw milk is herd-share only. Buy in once, pay a small monthly boarding fee, take home one to two gallons a week year-round.",
      },
      {
        label: "Eggs while they last",
        body: "Forty laying hens means forty dozen a week, give or take. First text on Friday gets the eggs.",
      },
    ],
    shareName: "The Wren Hollow share",
    shareDescription:
      "One vegetable share each week plus optional milk and eggs, picked up at the farm Saturday morning or in Floyd Tuesday afternoon.",
    pickupSummary:
      "Saturday at the farm, Tuesday at the Floyd country store, first Thursday in Blacksburg.",
    faq: [
      {
        q: "I've never done a CSA before. What if it's too much vegetable?",
        a: "Reply PAUSE any week and we'll skip you and credit your account. Split the share with a neighbor — we'll text both of you. Give the box to the food pantry by replying DONATE. We'd rather you stay subscribed and skip than feel guilty.",
      },
      {
        q: "Is the milk legal?",
        a: "Virginia permits raw milk only through herd-share agreements — you become a co-owner of the cow, and your boarding fee pays for our labor caring for your portion of the herd. We send the contract by email; it's plain English and you can ask us anything.",
      },
      {
        q: "Can we visit?",
        a: "Yes, please. Saturday mornings during pickup, or by arrangement. Bring children. There's a dog. The cows will introduce themselves.",
      },
    ],
    closingBlessing: "We will see you in the spring.",
  },

  "Vegetable CSA": {
    heroHeadline: "Six acres of vegetables, kept by hand.",
    tagline:
      "Twenty-two weeks of greens, roots, and tomatoes from a small farm on the south slope above the creek.",
    about:
      "We grow about forty crops over the season — heavy on the alliums and the brassicas, light on the things deer prefer. We use mulch instead of tillage, and the leaves the township drops off in November feed the soil all winter. The work is mostly done by the two of us and our daughter, who gets a wage in cash and the right to plant one corner of the field however she likes.",
    callouts: [
      {
        label: "Twenty-two weeks of vegetables",
        body: "First share around the third week of May, last around the third week of October. You get what's best each week, not what you ordered last spring.",
      },
      {
        label: "Swap by text",
        body: "Every Saturday we text you the week's box. You have until Monday at six to swap any two items for two others. Reply DONATE and we send your share to the food pantry instead.",
      },
      {
        label: "Pick-your-own through August",
        body: "Cherry tomatoes, herbs, and cut flowers in the patch by the barn. Bring scissors and a basket.",
      },
    ],
    shareName: "The standard share",
    shareDescription:
      "Seven to ten items a week for twenty-two weeks, with pick-your-own herbs and tomatoes through August.",
    pickupSummary:
      "Tuesday afternoons at the farm, Wednesday morning at the coffee shop, Wednesday afternoon at the library.",
    faq: [
      {
        q: "What happens if I'm going to be away?",
        a: "Reply PAUSE to your Tuesday text. We pause your share for as many weeks as you tell us and credit your account for those weeks. Or give it to a neighbor — reply GIFT and a name.",
      },
      {
        q: "Do you spray?",
        a: "Occasionally, for cabbage moth and squash bug — only OMRI-listed sprays. We're not certified organic; the paperwork is more than we can carry. Visit and we'll walk you through everything we use.",
      },
      {
        q: "Can I bring my children?",
        a: "Please. There's a sandbox, a friendly dog, and cherry tomatoes you may eat off the vine.",
      },
    ],
    closingBlessing: "Welcome to the table.",
  },

  "Raw milk herd share": {
    heroHeadline: "Twelve Jersey cows, on grass at nine thousand feet.",
    tagline:
      "A small herd-share dairy in the South Park basin, milked by hand twice a day, tested monthly, kept honestly.",
    about:
      "The dairy sits where three forks of the South Platte come together. The herd is twelve Jersey cows — each one with a name, a temperament, and a calving history we know by heart. They graze rotated pasture from May through October and eat local grass hay through the winter. Our members own a fractional share of the herd; that's how Colorado law works, and we follow it carefully.",
    callouts: [
      {
        label: "Two gallons a week, year-round",
        body: "A 1/30th share entitles you to two gallons of raw milk per week. Take more or less in any given week — we keep a running balance.",
      },
      {
        label: "A boarding fee, not a milk price",
        body: "By Colorado law we cannot sell raw milk. Your monthly boarding fee pays for our labor caring for your portion of the herd: feeding, milking, vet care, pasture.",
      },
      {
        label: "Tested monthly, posted publicly",
        body: "Standard plate count and coliform results are posted by the fifth of every month and texted to every shareholder. We use the CSU extension lab.",
      },
    ],
    shareName: "1/30th cow share",
    shareDescription:
      "A one-time share purchase plus a monthly boarding fee, with two gallons of milk a week for as long as you keep your share.",
    pickupSummary:
      "Saturday morning at the dairy, Wednesday afternoon at the Bailey library.",
    faq: [
      {
        q: "Is raw milk legal in Colorado?",
        a: "The sale of raw milk is not legal in Colorado. Herd shares — private contracts in which you own a fractional interest in the cow — are. Your share purchase makes you a co-owner; you are not buying milk, you are consuming milk from an animal you partially own.",
      },
      {
        q: "What if I miss a pickup?",
        a: "We hold your allotment for two weeks. After that it goes to staff or, with your permission, to a family on the waiting list.",
      },
      {
        q: "Can I visit the cows?",
        a: "Yes. Saturday mornings during pickup, or anytime by arrangement. The cows will remember you faster than you'll remember them.",
      },
    ],
    closingBlessing: "Pax tibi. See you at the dairy.",
  },

  "Pastured meat": {
    heroHeadline: "Grass-fed beef from a quiet bend of Low Creek.",
    tagline:
      "Cattle rotated daily, pork finished on acorns, eggs gathered every morning — raised the way our grandparents would recognize.",
    about:
      "Two hundred and twelve acres on a quiet bend of Low Creek, half in pasture and half in hardwood. We rotate cattle daily across the open ground, follow them with laying hens to scratch the manure in, and run the hogs through the woods to clear understory and finish on acorns in the fall. Nothing here gets corn or soy. We process at a state-inspected facility forty minutes north.",
    callouts: [
      {
        label: "Quarter, half, or whole beef",
        body: "Reserve in February, cattle finish in November. You'll get a butcher cut-sheet by email and we'll auto-charge the balance based on actual hanging weight.",
      },
      {
        label: "A monthly meat share",
        body: "For those who don't want to fill a chest freezer all at once: a mixed box of cuts, delivered to one of seven Tennessee drop sites.",
      },
      {
        label: "Eggs while they last",
        body: "Forty dozen a week, give or take. First reply to the Friday text gets the eggs.",
      },
    ],
    shareName: "Quarter Beef",
    shareDescription:
      "Roughly ninety to a hundred and ten pounds of cut meat, your choice of cuts on the butcher form, ready in November.",
    pickupSummary:
      "Saturday morning at the ranch, first Sunday of the month in East Nashville.",
    faq: [
      {
        q: "Why hanging weight?",
        a: "Hanging weight is the carcass after head, hide, and offal are removed — how every small farm in the country prices a beef share. You'll get roughly sixty to sixty-five percent of hanging weight back as packaged meat.",
      },
      {
        q: "Can I visit?",
        a: "Yes — we have a farm day every May. Bring children, dogs, walking shoes. There's a pond.",
      },
      {
        q: "Do you ship?",
        a: "No. We're small and shipping frozen meat well takes infrastructure we don't have. The drop sites are how we serve people outside Lewis County.",
      },
    ],
    closingBlessing: "We will see you at the ranch.",
  },

  "Pastured eggs": {
    heroHeadline: "Forty hens, on grass, behind the cattle.",
    tagline:
      "A small egg operation that follows the cows around our cousin's farm, scratching the manure in and eating what they please.",
    about:
      "We keep forty laying hens in a mobile coop, moved every two or three days to wherever the cattle were last week. They eat what they find, a little organic grain, and as much grass and bug as suits them. We don't trim beaks, we don't cull old layers, and the eggs taste like spring even in January.",
    callouts: [
      {
        label: "A dozen a week, on subscription",
        body: "Eight dollars a dozen, delivered to one of three pickup sites or to the farm gate. Pause anytime by text.",
      },
      {
        label: "First-text-wins overflow",
        body: "Some weeks we have extras. We text the list — first three replies get a second dozen at six dollars.",
      },
      {
        label: "Surplus to the food pantry",
        body: "If you skip a week without claiming credit, your dozen goes to the Athens food pantry.",
      },
    ],
    shareName: "Weekly dozen",
    shareDescription:
      "One dozen pastured eggs a week, year-round, with a small winter slowdown when production drops.",
    pickupSummary:
      "Tuesday at the farm gate, Wednesday in Athens at the coffee shop, Saturday at the farmers' market.",
    faq: [
      {
        q: "What happens in winter?",
        a: "Hens lay less when the days are short. We'll text you in November if we need to reduce shares to every other week — you'll get a credit for the missed weeks.",
      },
      {
        q: "Are they certified organic?",
        a: "No. The hens eat a small amount of conventional grain in winter. We feed them what we can afford to feed them, and we'd rather be honest about it than chase a label.",
      },
      {
        q: "Can I bring my kids to see the chickens?",
        a: "Yes — best is Saturday morning when we're moving the coop. They can help.",
      },
    ],
    closingBlessing: "From the henhouse, with our thanks.",
  },

  "Market garden": {
    heroHeadline: "Two acres, no-till, hand-worked.",
    tagline:
      "A market garden run by two women and a 1956 Allis-Chalmers, growing vegetables for fifty members and the Saturday market.",
    about:
      "Two acres on land we lease from an elderly neighbor in exchange for half the lettuce. We grow forty crops for fifty members, sell the surplus at the Saturday market, and are slowly bringing the soil back from a former Christmas tree farm. Lila refuses to learn to drive the tractor, which is fine — Frances likes driving it.",
    callouts: [
      {
        label: "Twenty-eight weeks, May to November",
        body: "Long season, mild winters, a lot of variety. Greens in May, tomatoes in September, kale until the first hard frost.",
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
    shareName: "Half share",
    shareDescription:
      "Five to seven items each week for twenty-eight weeks, with Friday pick-your-own flowers.",
    pickupSummary:
      "Friday at the farm, Saturday morning at Pongo's Kitchen in Petaluma.",
    faq: [
      {
        q: "Are you certified organic?",
        a: "No. We farm to a standard that exceeds organic, but the certification cost is not worth it at our scale. We'd rather you visit and see.",
      },
      {
        q: "Can my share be SNAP-eligible?",
        a: "Yes, starting in 2026. We're working on it.",
      },
      {
        q: "What if a crop fails?",
        a: "It happens — last year the cucumbers gave up in July. We make it up to you with more of whatever's doing well, and we tell you the truth in the Friday text.",
      },
    ],
    closingBlessing: "See you Friday at the gate.",
  },

  "Orchard / fruit share": {
    heroHeadline: "An old orchard, brought back slowly.",
    tagline:
      "Apples and pears and a few stubborn quinces from an orchard our grandfather planted in the year nineteen-fifty-eight.",
    about:
      "Eight acres of fruit trees on a south-facing slope, most of them planted by our grandfather in the late fifties. We've spent the last decade pruning out the deadwood, learning which varieties want what, and grafting over the trees that gave up. The fruit comes from August through November.",
    callouts: [
      {
        label: "A weekly fruit share",
        body: "Five to eight pounds of fresh fruit each week from August through November — apples, pears, plums, and the first frost-ripened persimmons.",
      },
      {
        label: "Cider in November",
        body: "We press once a week through November. Shareholders get first option on jugs at cost.",
      },
      {
        label: "Visit and pick",
        body: "Two pick-your-own weekends a season, free to shareholders. Bring boxes.",
      },
    ],
    shareName: "Fall fruit share",
    shareDescription:
      "Twelve weeks of seasonal fruit, August through October, plus first option on the November cider press.",
    pickupSummary:
      "Saturday at the orchard, Wednesday at the church parking lot in town.",
    faq: [
      {
        q: "What varieties do you grow?",
        a: "Heritage apples mostly — Northern Spy, Cox's Orange Pippin, Roxbury Russet, Newtown Pippin — plus Bartlett and Bosc pears. The varieties shift as we re-graft.",
      },
      {
        q: "Do you spray?",
        a: "We use IPM — integrated pest management — and the lowest-impact sprays that will save the crop. Codling moth is the hardest. We'll tell you exactly what we used any week you ask.",
      },
      {
        q: "Can I bring kids to pick?",
        a: "Yes. The pick-your-own weekends are the best — a long table of cider and donuts in the barn.",
      },
    ],
    closingBlessing: "See you in apple weather.",
  },

  "Flower farm": {
    heroHeadline: "A small flower farm, run by one woman and a dog.",
    tagline:
      "Bouquets for the season, grown two miles from town on land that used to be a soccer field.",
    about:
      "One acre of cut flowers — zinnias, dahlias, sunflowers, snapdragons, the occasional row of strawflowers — grown without chemicals and harvested before the heat of the day. I'm one person, plus an English shepherd named Atlas, plus my neighbor's daughter on Saturdays.",
    callouts: [
      {
        label: "A weekly bouquet, twenty weeks",
        body: "Hand-tied bouquets each week from late May through October. Eight dollars per stem worth of flowers, give or take, varying by what's blooming.",
      },
      {
        label: "Weddings welcome",
        body: "I take a few weddings per season. Reach out by the new year to talk dates.",
      },
      {
        label: "Pick-your-own Saturdays",
        body: "Every Saturday morning in July and August. Bring jars.",
      },
    ],
    shareName: "Weekly bouquet share",
    shareDescription:
      "One hand-tied bouquet a week for twenty weeks, available at the farm or at the Saturday market.",
    pickupSummary:
      "Saturday at the farm gate, Saturday morning at the downtown market.",
    faq: [
      {
        q: "What flowers will I get?",
        a: "Whatever's most beautiful that week. A mid-July bouquet looks nothing like a mid-September one, and that's the point.",
      },
      {
        q: "What if I want to give a bouquet as a gift?",
        a: "Reply GIFT and a name and address — I'll deliver it that week with a card.",
      },
      {
        q: "Do you ship?",
        a: "No. Flowers want to be picked up the same morning they're cut. Shipping is hard on them.",
      },
    ],
    closingBlessing: "From the field, with thanks.",
  },
};
