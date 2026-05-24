// Demo data for the farmer dashboard when Supabase isn't configured.
// All shapes match the persisted Supabase tables in lib/supabase/types.ts.

export type DemoProduct = {
  id: number;
  name: string;
  description?: string;
  kind: "fixed" | "catch_weight" | "share";
  price_cents: number;
  unit_label: string;
  inventory_cap: number | null;
  inventory_now: number | null;
  is_sold_out: boolean;
};

export type DemoMember = {
  id: string;
  display_name: string;
  email: string;
  share_name: string;
  joined_on: string;
  credit_balance_cents: number;
  status: "active" | "paused" | "cancelled";
  pickup_site: string;
};

export type DemoOrder = {
  id: string;
  member: string;
  pickup_site: string;
  pickup_date: string;
  status:
    | "draft"
    | "confirmed"
    | "packed"
    | "picked_up"
    | "no_show"
    | "donated";
  total_cents: number;
  items: string[];
};

export type DemoSms = {
  id: string;
  member: string;
  phone: string;
  direction: "inbound" | "outbound";
  body: string;
  intent?: string;
  at: string;
};

export const demoFarm = {
  id: "demo-farm",
  slug: "wren-hollow",
  name: "Wren Hollow Farm",
  location: "Floyd County, Virginia",
  kind: "Mixed farm",
  active_members: 47,
  weekly_revenue_cents: 169200,
  unread_messages: 3,
};

export const demoProducts: DemoProduct[] = [
  {
    id: 1,
    name: "Lacinato kale",
    description: "Bunch, ~3/4 lb",
    kind: "fixed",
    price_cents: 400,
    unit_label: "bunch",
    inventory_cap: 80,
    inventory_now: 62,
    is_sold_out: false,
  },
  {
    id: 2,
    name: "Pastured eggs",
    description: "Dozen, mixed brown",
    kind: "fixed",
    price_cents: 800,
    unit_label: "dozen",
    inventory_cap: 40,
    inventory_now: 0,
    is_sold_out: true,
  },
  {
    id: 3,
    name: "Hakurei turnips",
    description: "Bunch with greens",
    kind: "fixed",
    price_cents: 350,
    unit_label: "bunch",
    inventory_cap: 50,
    inventory_now: 38,
    is_sold_out: false,
  },
  {
    id: 4,
    name: "Half hog",
    description: "By hanging weight",
    kind: "catch_weight",
    price_cents: 595,
    unit_label: "lb",
    inventory_cap: 6,
    inventory_now: 4,
    is_sold_out: false,
  },
  {
    id: 5,
    name: "Sunflower bouquet",
    description: "12 stems, mixed varieties",
    kind: "fixed",
    price_cents: 1500,
    unit_label: "bouquet",
    inventory_cap: 25,
    inventory_now: 25,
    is_sold_out: false,
  },
  {
    id: 6,
    name: "Raw cream",
    description: "1/2 gallon, herd-share members only",
    kind: "fixed",
    price_cents: 1800,
    unit_label: "half-gal",
    inventory_cap: 10,
    inventory_now: 6,
    is_sold_out: false,
  },
];

export const demoMembers: DemoMember[] = [
  {
    id: "m1",
    display_name: "Sarah Whitmore",
    email: "sarah.w@example.com",
    share_name: "Standard share",
    joined_on: "2026-03-14",
    credit_balance_cents: 4200,
    status: "active",
    pickup_site: "Donkey Coffee",
  },
  {
    id: "m2",
    display_name: "Tomás Reyes",
    email: "tomas@example.com",
    share_name: "Standard share",
    joined_on: "2025-09-02",
    credit_balance_cents: 0,
    status: "active",
    pickup_site: "The farm",
  },
  {
    id: "m3",
    display_name: "Mei Chen",
    email: "mei.chen@example.com",
    share_name: "Half share",
    joined_on: "2026-04-21",
    credit_balance_cents: 1800,
    status: "paused",
    pickup_site: "Nelsonville library",
  },
  {
    id: "m4",
    display_name: "Caleb Anderson",
    email: "caleb.a@example.com",
    share_name: "1/30th cow share",
    joined_on: "2024-11-08",
    credit_balance_cents: 11500,
    status: "active",
    pickup_site: "The farm",
  },
  {
    id: "m5",
    display_name: "Priya Iyer",
    email: "priya@example.com",
    share_name: "Quarter beef",
    joined_on: "2026-02-01",
    credit_balance_cents: 25000,
    status: "active",
    pickup_site: "East Nashville",
  },
  {
    id: "m6",
    display_name: "Jonas Roth",
    email: "jonas.r@example.com",
    share_name: "Standard share",
    joined_on: "2026-05-04",
    credit_balance_cents: 0,
    status: "active",
    pickup_site: "Donkey Coffee",
  },
  {
    id: "m7",
    display_name: "Adaeze Okonkwo",
    email: "ada@example.com",
    share_name: "Standard share",
    joined_on: "2025-05-12",
    credit_balance_cents: 800,
    status: "active",
    pickup_site: "Donkey Coffee",
  },
];

export const demoOrders: DemoOrder[] = [
  {
    id: "o1",
    member: "Sarah Whitmore",
    pickup_site: "Donkey Coffee",
    pickup_date: "today",
    status: "confirmed",
    total_cents: 3600,
    items: ["Lacinato kale", "Carrots, 1 lb", "Pastured eggs"],
  },
  {
    id: "o2",
    member: "Tomás Reyes",
    pickup_site: "The farm",
    pickup_date: "today",
    status: "packed",
    total_cents: 3600,
    items: ["Lacinato kale", "Hakurei turnips", "Eggs"],
  },
  {
    id: "o3",
    member: "Adaeze Okonkwo",
    pickup_site: "Donkey Coffee",
    pickup_date: "today",
    status: "confirmed",
    total_cents: 4400,
    items: ["Half-share box", "Sunflower bouquet"],
  },
  {
    id: "o4",
    member: "Jonas Roth",
    pickup_site: "Donkey Coffee",
    pickup_date: "today",
    status: "no_show",
    total_cents: 3600,
    items: ["Standard share box"],
  },
];

export const demoSms: DemoSms[] = [
  {
    id: "s1",
    member: "Sarah Whitmore",
    phone: "+1 540 555 0142",
    direction: "outbound",
    body: "Hey Sarah — your Tuesday share: kale, carrots, eggs. Reply SWAP, SKIP, DONATE, or GIFT by Mon 6pm. 🌾",
    at: "Yesterday 8:00 AM",
  },
  {
    id: "s2",
    member: "Sarah Whitmore",
    phone: "+1 540 555 0142",
    direction: "inbound",
    body: "swap kale for spinach",
    intent: "swap",
    at: "Yesterday 8:14 AM",
  },
  {
    id: "s3",
    member: "Sarah Whitmore",
    phone: "+1 540 555 0142",
    direction: "outbound",
    body: "Done. Tuesday share: spinach, carrots, eggs.",
    at: "Yesterday 8:14 AM",
  },
  {
    id: "s4",
    member: "Mei Chen",
    phone: "+1 415 555 0188",
    direction: "inbound",
    body: "pause 2",
    intent: "pause",
    at: "Yesterday 11:32 AM",
  },
  {
    id: "s5",
    member: "Mei Chen",
    phone: "+1 415 555 0188",
    direction: "outbound",
    body: "Paused for 2 weeks — you'll be back on the list for the week of May 18. We'll credit your account for the missed shares.",
    at: "Yesterday 11:32 AM",
  },
  {
    id: "s6",
    member: "Caleb Anderson",
    phone: "+1 720 555 0103",
    direction: "inbound",
    body: "any extra cream this week?",
    at: "This morning 6:47 AM",
  },
];

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
