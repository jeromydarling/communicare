"use client";

// =============================================================================
// BillingBanner — surfaces subscription state inside the farmer dashboard
// =============================================================================
// Three states the banner cares about:
//   - 'unpaid' (signup completed, never paid): "Add a card to unlock SMS,
//      publishing, and invites." Big primary button → Stripe Checkout.
//   - 'past_due' (renewal failed): "Your card declined; the desk locks
//      in N days unless we get a new one." Button → Billing Portal.
//   - 'canceled': "Your subscription ended on <date>. Re-open the desk?"
//      Button → Checkout.
//
// 'active' renders nothing. The component is meant to live just below
// the PageHeader on every farmer page so the prompt is always one
// scroll away.
// =============================================================================

import { useEffect, useState } from "react";
import type { BillingSnapshot } from "@/lib/farmer/api";
import {
  getMeWithFarm,
  startCheckoutSession,
  openBillingPortal,
} from "@/lib/farmer/api";

export function BillingBanner() {
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeWithFarm().then((res) => {
      if (cancelled) return;
      if ("ok" in res && res.ok && res.billing) setBilling(res.billing);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!billing || billing.subscription_status === "active") return null;

  async function goToCheckout() {
    setBusy(true);
    setError(null);
    const res = await startCheckoutSession();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    window.location.href = res.url;
  }

  async function goToPortal() {
    setBusy(true);
    setError(null);
    const res = await openBillingPortal();
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    window.location.href = res.url;
  }

  const { headline, body, action } = messageFor(billing);
  const onClick = action === "checkout" ? goToCheckout : goToPortal;
  const buttonLabel =
    action === "checkout" ? "Open the desk · $9/mo" : "Update payment";

  return (
    <div className="mx-6 md:mx-10 mt-4 mb-2">
      <div className="paper bg-wheat/10 border-wheat px-6 py-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <div className="small-caps text-[10px] text-brick mb-1">
            Your farm desk
          </div>
          <p className="display text-lg font-medium leading-snug">{headline}</p>
          <p className="text-sm text-soil/70 leading-snug mt-1">{body}</p>
          {error && (
            <p className="text-sm text-brick mt-2 italic">{error}</p>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className="btn btn-primary whitespace-nowrap disabled:opacity-50"
          >
            {busy ? "Opening Stripe…" : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function messageFor(billing: BillingSnapshot): {
  headline: string;
  body: string;
  action: "checkout" | "portal";
} {
  switch (billing.subscription_status) {
    case "past_due":
      return {
        headline: "Your card declined.",
        body:
          "Update your payment in Stripe and we'll keep the desk open. If we can't bill, SMS and publishing pause until we can.",
        action: "portal",
      };
    case "canceled":
      return {
        headline:
          "Your subscription ended" +
          (billing.period_end
            ? ` on ${billing.period_end.slice(0, 10)}.`
            : "."),
        body: "Reopen for nine dollars a month. Your data is waiting.",
        action: "checkout",
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        headline: "Payment didn't go through.",
        body: "Try again with a different card to finish opening the desk.",
        action: "checkout",
      };
    case "unpaid":
    default:
      return {
        headline: "One more step: add a card.",
        body:
          "Nine dollars a month opens the SMS swap loop, the homepage publisher, and the member invites. Cancel anytime.",
        action: "checkout",
      };
  }
}
