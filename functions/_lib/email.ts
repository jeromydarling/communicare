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

// =============================================================================
// Templates
// =============================================================================
// Two languages: en (default) and es. Spanish copy is hand-tuned to
// preserve the editorial register — warm, plain-spoken, not formal /
// "Estimado señor" register. If you add a third language, mirror this
// pattern (template-per-locale) rather than runtime-translating the
// template body via /api/translate — voice consistency matters more
// than the LOC savings.

export type Locale = "en" | "es";

export function magicLinkEmail(opts: {
  to: string;
  link: string;
  purpose: "signin" | "invite" | "confirm";
  farmName?: string;
  locale?: Locale;
}): SendArgs {
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") return magicLinkEmailEs(opts);
  return magicLinkEmailEn(opts);
}

function magicLinkEmailEn(opts: {
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

// Spanish templates — same plain-spoken register as the English ones.
// Reviewed for tone, not literal back-translation. "Pax tibi" stays in
// Latin (it's a brand signature, not a phrase to translate).
function magicLinkEmailEs(opts: {
  to: string;
  link: string;
  purpose: "signin" | "invite" | "confirm";
  farmName?: string;
}): SendArgs {
  if (opts.purpose === "signin") {
    return {
      to: opts.to,
      subject: "Tu enlace para entrar a Communicare",
      text: `Hola —

Aquí está tu enlace para entrar a Communicare. Es válido por una hora
y te abre la cuenta directamente — no hay contraseña que recordar:

${opts.link}

Si no pediste esto, puedes ignorarlo. No pasa nada hasta que se haga
clic en el enlace.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  if (opts.purpose === "invite") {
    const farm = opts.farmName ?? "tu granja";
    return {
      to: opts.to,
      subject: `${farm} te añadió en Communicare`,
      text: `Hola —

${farm} acaba de añadirte en Communicare. Haz clic en este enlace para
confirmar tu parte, elegir tu punto de recogida, y dejar una tarjeta
guardada si quieres. El enlace es válido por una hora:

${opts.link}

No hay contraseña nueva que memorizar — al hacer clic en el enlace ya
estás dentro. Puedes ponerte una contraseña después desde tu cuenta.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Confirma tu correo en Communicare",
    text: `Hola —

Confirma tu correo haciendo clic en este enlace. Válido por una hora:

${opts.link}

Si no te registraste, puedes ignorar este mensaje.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

export function passwordResetEmail(opts: {
  to: string;
  link: string;
  locale?: Locale;
}): SendArgs {
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Restablece tu contraseña de Communicare",
      text: `Hola —

Pediste restablecer tu contraseña de Communicare. Haz clic aquí para
escoger una nueva — el enlace es válido por una hora:

${opts.link}

Si no lo pediste, ignora este mensaje. Tu contraseña actual sigue
funcionando.

¿Algún problema? Escríbenos a ${SUPPORT_EMAIL}.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
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

// =============================================================================
// Locale detection
// =============================================================================
// Browsers send Accept-Language with weighted preferences. We pick the
// first supported language; default to English if none match. This is
// used at signup to seed users.preferred_locale.
//
// Once the user is signed in, their stored preference takes over and
// Accept-Language is ignored — they've expressed an explicit choice.

export function detectLocaleFromRequest(req: Request): Locale {
  const header = req.headers.get("Accept-Language") ?? "";
  // Accept-Language: "es-MX,es;q=0.9,en;q=0.8"
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const tag of tags) {
    if (tag === "es" || tag.startsWith("es-")) return "es";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}
