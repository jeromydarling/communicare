// =============================================================================
// email — Resend REST wrapper + templates
// =============================================================================
// All outbound transactional mail flows through here. Single provider
// (Resend) because Workers AI hasn't shipped an email peer and the
// MailChannels integration sunset in 2024. Domain verification + DKIM
// records live in the Cloudflare DNS for mycommuni.care.
//
// Templates are plain-text only on purpose: the brand voice is
// editorial, not HTML-y, and plain text dodges every "your email looks
// like spam" classifier issue. If a farm starts asking for an HTML
// invoice or marketing template, that's the right time to add a multipart
// helper here — not before.
// =============================================================================

import { CLOSING_BLESSING, SUPPORT_EMAIL } from "../../lib/brand-strings";

export type SendArgs = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  // Optional From override. Defaults to the verified hello@ address.
  from?: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

export async function sendEmail(
  apiKey: string | undefined,
  fromDefault: string | undefined,
  args: SendArgs,
): Promise<SendResult> {
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: "RESEND_API_KEY missing on this deploy.",
    };
  }
  const from = args.from ?? fromDefault ?? "Communicare <hello@mycommuni.care>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      reply_to: args.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text.slice(0, 400) };
  }
  const data = (await res.json()) as { id?: string };
  return { ok: true, id: data.id ?? "" };
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
  // confirm
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
