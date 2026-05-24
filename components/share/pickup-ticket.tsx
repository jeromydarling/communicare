"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Mark, Wheat, Sun } from "@/components/mark";

// Server-renderable QR-code pickup ticket. The QR encodes a short URL
// (e.g. https://wren-hollow.communicare.farm/p/WHF-991) that the farmer
// scans with their phone — opens the roster row for this member and lets
// them tap "picked up" in one move. The member sees the basket contents
// + pickup location below the code.

export type PickupTicket = {
  farmName: string;
  farmSlug: string;
  memberId: string;
  memberName: string;
  pickupDate: string;
  pickupSite: string;
  pickupWindow: string;
  pickupAddress?: string;
  basket: { name: string; detail?: string; status?: "paid" | "due" }[];
  addOns?: { name: string; detail?: string; status: "paid" | "due"; price?: string }[];
  note?: string;
};

export function PickupTicketCard({
  ticket,
  origin,
}: {
  ticket: PickupTicket;
  origin?: string;
}) {
  const [qr, setQr] = useState<string | null>(null);

  // Compose the URL the QR encodes
  const url =
    (origin ?? (typeof window !== "undefined" ? window.location.origin : "")) +
    `/p/${ticket.memberId}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: { dark: "#2D1F12", light: "#FAF5ED" },
      errorCorrectionLevel: "M",
    }).then((dataUrl) => {
      if (!cancelled) setQr(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="paper overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-soil text-parchment px-6 pt-6 pb-5 text-center relative">
        <div className="absolute inset-0 bg-grain opacity-30 pointer-events-none" />
        <div className="relative">
          <Mark className="w-9 h-9 text-wheat mx-auto mb-2" />
          <div className="small-caps text-[10px] text-wheat tracking-[0.2em]">
            Harvest pickup
          </div>
          <h1 className="display text-2xl font-medium mt-1">
            {ticket.farmName}
          </h1>
          <div className="text-xs text-parchment/65 italic mt-1">
            {ticket.pickupDate} · {ticket.pickupWindow}
          </div>
        </div>
      </div>

      {/* QR code */}
      <div className="px-6 pt-6 pb-2 text-center">
        <div className="inline-block paper p-4 bg-parchment border-soil/15">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt={`Pickup ticket QR for ${ticket.memberName}`}
              className="w-44 h-44 block"
            />
          ) : (
            <div className="w-44 h-44 grid place-items-center bg-cream">
              <Sun className="w-10 h-10 text-wheat animate-[spin_8s_linear_infinite]" />
            </div>
          )}
        </div>
        <div className="small-caps text-[10px] text-soil/55 mt-4">
          Member ID
        </div>
        <div className="display text-3xl font-medium text-soil tracking-wider">
          {ticket.memberId}
        </div>
        <div className="text-xs italic text-soil/55 mt-1">
          {ticket.memberName}
        </div>
      </div>

      {/* Basket */}
      <div className="px-6 py-5 border-t border-soil/10">
        <div className="small-caps text-xs text-brick mb-3">
          Today&apos;s basket
        </div>
        <ul className="space-y-2">
          {ticket.basket.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                <span className="text-wheat display mr-2">❀</span>
                {item.name}
              </span>
              <span className="text-xs italic text-soil/55 text-right shrink-0">
                {item.detail}
              </span>
            </li>
          ))}
        </ul>

        {ticket.addOns && ticket.addOns.length > 0 && (
          <>
            <div className="small-caps text-xs text-brick mt-5 mb-3">
              Reserved add-ons
            </div>
            <ul className="space-y-2">
              {ticket.addOns.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={item.status === "paid"}
                      className="w-4 h-4 accent-mossDark"
                      readOnly
                    />
                    <span>
                      {item.name}
                      {item.detail && (
                        <span className="text-xs italic text-soil/55 ml-2">
                          {item.detail}
                        </span>
                      )}
                    </span>
                  </span>
                  {item.status === "paid" ? (
                    <span className="small-caps text-[10px] px-2 py-0.5 rounded-full bg-moss/15 text-mossDark">
                      Paid
                    </span>
                  ) : (
                    <span className="text-sm display text-brick">
                      {item.price ?? "Due"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Location */}
      <div className="px-6 py-4 border-t border-soil/10 bg-cream/40">
        <div className="flex items-start gap-3">
          <Wheat className="w-5 h-7 text-wheatDark shrink-0 mt-0.5" />
          <div>
            <div className="display text-soil leading-tight">
              {ticket.pickupSite}
            </div>
            {ticket.pickupAddress && (
              <div className="text-xs text-soil/60 italic">
                {ticket.pickupAddress}
              </div>
            )}
            {ticket.note && (
              <div className="text-xs text-soil/65 mt-1.5 italic">
                {ticket.note}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        className="block w-full bg-brick text-parchment py-4 display text-base font-medium hover:bg-brickDark transition-colors"
      >
        Mark as picked up →
      </button>

      <div className="text-center text-[10px] text-soil/45 small-caps py-3 tracking-[0.2em]">
        Enduring tools for the soil
      </div>
    </div>
  );
}
