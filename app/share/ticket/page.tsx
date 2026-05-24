"use client";

import Link from "next/link";
import { PickupTicketCard, type PickupTicket } from "@/components/share/pickup-ticket";

const DEMO_TICKET: PickupTicket = {
  farmName: "Wren Hollow Farm",
  farmSlug: "wren-hollow",
  memberId: "WHF-991",
  memberName: "Sarah Whitmore",
  pickupDate: "Tuesday, October 24",
  pickupSite: "Donkey Coffee, Court St.",
  pickupAddress: "17 W Washington St, Athens OH",
  pickupWindow: "3:00 – 7:00 pm",
  basket: [
    { name: "Lacinato kale", detail: "1 bunch, sweetened by frost" },
    { name: "Hakurei turnips", detail: "1 bunch, with greens" },
    { name: "Sungold tomatoes", detail: "1 pint, last of the season" },
    { name: "Spring onions", detail: "1 bunch" },
    { name: "Garlic scapes", detail: "1 small bundle" },
  ],
  addOns: [
    { name: "1 dozen pastured eggs", detail: "weekly", status: "paid" },
    { name: "Sunflower bouquet", detail: "single stem", status: "due", price: "$12.00" },
  ],
  note: "Bring a reusable bag. The shop closes at 7:30; we cannot hold shares past close.",
};

export default function PickupTicketPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <div className="mb-6 text-center">
        <div className="small-caps text-xs text-brick mb-1">
          Your pickup pass
        </div>
        <p className="text-sm text-soil/65 italic">
          Show this screen at the pickup site. The farmer scans the code; you
          tap Mark as picked up.
        </p>
      </div>

      <PickupTicketCard ticket={DEMO_TICKET} />

      <div className="text-center mt-8 space-y-2">
        <Link
          href="/share/"
          className="display italic text-brick hover:underline text-sm"
        >
          ← Back to this week&apos;s share
        </Link>
        <div className="text-xs text-soil/55 italic">
          Can&apos;t make it? Reply to your Tuesday text — say{" "}
          <span className="font-mono not-italic">skip</span>,{" "}
          <span className="font-mono not-italic">donate</span>, or{" "}
          <span className="font-mono not-italic">gift &lt;name&gt;</span>.
        </div>
      </div>
    </div>
  );
}
