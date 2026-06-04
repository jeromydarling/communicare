// =============================================================================
// email — Cloudflare Email Service via the EMAIL binding
// =============================================================================
// As of April 2026, Cloudflare Email Sending is in public beta on the
// Workers paid plan, with arbitrary-recipient transactional delivery.
// We use the Workers binding (`send_email` in wrangler.jsonc → env.EMAIL)
// for everything: magic links, password resets, invites, inquiry
// outreach. Inbound at hello@ / migrate@ still uses Email Routing.
//
// Templates are plain-text only on purpose: the brand voice is
// editorial, not HTML-y, and plain text dodges every "your email looks
// like spam" classifier. If a farm starts asking for an HTML invoice or
// marketing template, that's the right time to add an HTML field below.
//
// Domain onboarding (one-time): Cloudflare dashboard → Compute & AI →
// Email Service → Onboard Domain. Adds SPF + DKIM to your zone.
// =============================================================================

import { CLOSING_BLESSING, SUPPORT_EMAIL } from "../../lib/brand-strings";

// The shape of the CF EMAIL binding. We don't import the wrangler types
// here so this file can be type-checked under either the Pages or the
// Worker tsconfig.
export type EmailSendBinding = {
  send: (msg: {
    from: string;
    to: string | string[];
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    headers?: Record<string, string>;
  }) => Promise<{ messageId?: string } | undefined>;
};

export type SendArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  /** Optional From override. Defaults to the SEND_FROM env var, then hello@mycommuni.care. */
  from?: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

export async function sendEmail(
  binding: EmailSendBinding | undefined,
  fromDefault: string | undefined,
  args: SendArgs,
): Promise<SendResult> {
  if (!binding) {
    return {
      ok: false,
      status: 500,
      error: "EMAIL binding missing — onboard the domain to Cloudflare Email Service.",
    };
  }
  const from = args.from ?? fromDefault ?? "Communicare <hello@mycommuni.care>";

  try {
    const resp = await binding.send({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      replyTo: args.replyTo,
    });
    return { ok: true, id: resp?.messageId ?? "" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 502, error: msg.slice(0, 400) };
  }
}

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------

export function magicLinkEmail(opts: {
  to: string;
  link: string;
  purpose: "signin" | "invite" | "confirm";
  farmName?: string;
}): SendArgs {
  if (opts.purpose === "signin") {
    return {
      to: opts.to,
      subject: "Your Communicare sign-in link",
      text: `Hi —

Here's your sign-in link for Communicare. It's good for one hour and
opens you straight in — no password to remember:

${opts.link}

If you didn't ask for this, you can ignore it. Nothing happens until
the link is clicked.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  if (opts.purpose === "invite") {
    const farm = opts.farmName ?? "your farm";
    return {
      to: opts.to,
      subject: `${farm} added you on Communicare`,
      text: `Hi —

${farm} just added you on Communicare. Click this link to confirm
your share, pick your pickup spot, and put a card on file if you want
to. The link is good for one hour:

${opts.link}

No new password to memorize — clicking the link signs you in. You
can switch to a password later from your account page.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Confirm your Communicare email",
    text: `Hi —

Confirm your email by clicking this link. Good for one hour:

${opts.link}

If you didn't sign up, you can ignore this.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

export function passwordResetEmail(opts: {
  to: string;
  link: string;
}): SendArgs {
  return {
    to: opts.to,
    subject: "Reset your Communicare password",
    text: `Hi —

You asked to reset your Communicare password. Click here to set a
new one — the link is good for one hour:

${opts.link}

If you didn't ask for this, ignore the email. Your current password
keeps working.

Stuck? Write us at ${SUPPORT_EMAIL}.

${CLOSING_BLESSING}
— Communicare
`,
  };
}
