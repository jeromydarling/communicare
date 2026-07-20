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
  /** Optional From override. Defaults to the SEND_FROM env var, then hello@communicare.farm. */
  from?: string;
};

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

// Strip CR/LF from any value that lands in a mail header. Defense
// against header injection if user-supplied content (e.g. farm_name)
// reaches Subject / From / Reply-To. Truncate over-long values too.
function safeHeader(value: string | undefined, maxLen = 200): string {
  if (!value) return "";
  return value.replace(/[\r\n\t]+/g, " ").slice(0, maxLen).trim();
}

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
  const from = safeHeader(args.from ?? fromDefault ?? "Communicare <hello@communicare.farm>");

  try {
    const resp = await binding.send({
      from,
      to: args.to,
      subject: safeHeader(args.subject, 300),
      text: args.text,
      replyTo: safeHeader(args.replyTo, 200) || undefined,
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
// Post-payment welcome — sent by the Stripe webhook on subscription-created
// =============================================================================
// Immediately after Stripe confirms the first successful payment, we
// send one welcoming note with concrete next steps. Warm but not
// gushing; assumes the farmer is busy and wants the shortest path to
// value.
// =============================================================================

export function welcomeEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Bienvenido a Communicare",
      text: `${greeting}

Bienvenido. Nueve dólares al mes y su escritorio de granja está abierto.

Tres pasos, en el orden que le convenga:

  1. Publique su granja — abra el sitio de su granja en dos minutos:
     ${dash}/farmer/site/
  2. Añada su primer miembro — importe una lista o escriba un nombre:
     ${dash}/farmer/members/
  3. Encienda el SMS del martes — el número, el día, la hora:
     ${dash}/farmer/sms/

Si algo no está claro, responda a este correo. Le llegará a una
persona, no a un bot.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Welcome to Communicare",
    text: `${greeting}

You're in. Nine dollars a month, and the farm desk is open.

Three next steps, in whichever order works for you:

  1. Publish your farm's homepage — draft one in two minutes:
     ${dash}/farmer/site/
  2. Add your first member — import a list or type one name in:
     ${dash}/farmer/members/
  3. Turn on the Tuesday SMS — pick a number, a day, an hour:
     ${dash}/farmer/sms/

Stuck on any of them? Reply to this note. It goes to a person, not a
bot.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// =============================================================================
// Onboarding drip — day 1, day 3, day 7 after signup
// =============================================================================
// Not nags; three short letters that each solve one specific worry a
// new farmer might have. If they've already done the thing the letter
// covers, the letter still reads as friendly, not condescending.
// =============================================================================

export function onboardingDayOneEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Un día en Communicare — el sitio de su granja",
      text: `${greeting}

Ha pasado un día. Si aún no ha abierto el sitio de su granja,
haga esto ahora: seis preguntas, dos minutos, un borrador honesto
que puede editar palabra por palabra.

${dash}/farmer/site/

El borrador no sabe el nombre de su vaca ni el arroyo detrás del
granero. Le da un punto de partida — usted escribe el resto.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "One day in — your farm's homepage",
    text: `${greeting}

It's been a day. If you haven't opened your farm's homepage yet,
this is the one to do next: six questions, two minutes, an honest
draft you can edit word by word.

${dash}/farmer/site/

The draft doesn't know your cow's name or the creek behind the
barn. It gives you a starting place — you write the rest.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

export function onboardingDayThreeEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Tres días — sus primeros miembros",
      text: `${greeting}

El paso tres es añadir a la gente que ya tiene. Importe su lista de
Barn2Door o Harvie, o escriba los nombres a mano. Cada miembro
recibe un enlace mágico para confirmar su recogida — sin
contraseñas.

${dash}/farmer/import/

Si necesita ayuda migrando desde otra herramienta, escríbanos —
lo hacemos a mano y no cobramos por ello.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Three days — your first members",
    text: `${greeting}

The third step is bringing over the people you already have. Import
your Barn2Door or Harvie list, or type the names in by hand. Every
member gets a magic-link email to confirm their pickup — no
passwords.

${dash}/farmer/import/

If you need help migrating from another tool, write us — we'll do
it by hand, and we won't charge for it.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

export function onboardingDaySevenEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Una semana — el bucle de los martes",
      text: `${greeting}

El bucle del martes es lo que hace que Communicare sea diferente:
un mensaje de texto a cada miembro cada semana con su porción, y
ellos responden CONFIRMAR, OMITIR, PAUSAR, o describen un cambio.
Sin contraseñas para sus vecinos, nunca.

${dash}/farmer/sms/

Configure el número y el horario, invite a un par de miembros y
mire cómo funciona. Va a cambiar cómo los martes se sienten.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "One week — the Tuesday loop",
    text: `${greeting}

The Tuesday loop is the thing that makes Communicare different:
one text to every member each week with their share, and they reply
CONFIRM, SKIP, PAUSE, or describe a swap. No passwords for your
neighbors, ever.

${dash}/farmer/sms/

Configure the number and schedule, invite a couple members, and
watch it work. It'll change what Tuesdays feel like.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// =============================================================================
// Weekly digest — sent Monday mornings to active farmers
// =============================================================================
// The Monday paper: how last week went. Counts of texts sent, replies
// received, new members joined, canceled subscriptions. If everything
// is zero we don't send — nobody needs a "you did nothing" letter.
// =============================================================================

export function weeklyDigestEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  farmName: string;
  weeklyOffersSent: number;
  repliesReceived: number;
  newMembers: number;
  canceledMembers: number;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  const replyRate =
    opts.weeklyOffersSent > 0
      ? Math.round((opts.repliesReceived / opts.weeklyOffersSent) * 100)
      : null;
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${opts.farmName} — la semana pasada, en números`,
      text: `${greeting}

Cómo fue la semana en ${opts.farmName}:

  • ${opts.weeklyOffersSent} textos enviados a los miembros
  • ${opts.repliesReceived} respuestas${replyRate != null ? ` (${replyRate}% tasa de respuesta)` : ""}
  • ${opts.newMembers} nuevos miembros
  • ${opts.canceledMembers} bajas

El escritorio: ${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${opts.farmName} — last week, in numbers`,
    text: `${greeting}

How last week went at ${opts.farmName}:

  • ${opts.weeklyOffersSent} texts sent to members
  • ${opts.repliesReceived} replies${replyRate != null ? ` (${replyRate}% reply rate)` : ""}
  • ${opts.newMembers} new members
  • ${opts.canceledMembers} left

The desk: ${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// =============================================================================
// Dormant-farmer nudge — seven days without a login
// =============================================================================
// Only sent once per stretch of dormancy; the cron resets the flag on
// their next login. Not a "we miss you" nag; a specific question about
// whether anything is broken.
// =============================================================================

export function dormantNudgeEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "¿Está todo bien con Communicare?",
      text: `${greeting}

Notamos que no ha abierto Communicare en una semana. No es una
queja — solo una pregunta honesta: ¿algo está roto, o simplemente
no es la temporada?

Si algo se rompió, respondamos este correo y lo arreglaremos. Si
está pausando la temporada, considere pausar su suscripción también
para no seguir pagando:

${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Everything alright with Communicare?",
    text: `${greeting}

We noticed you haven't opened Communicare in a week. Not a
complaint — an honest question: is something broken, or is it just
not the season?

If something broke, reply to this note and we'll fix it. If your
season is on pause, consider pausing the subscription too so we
stop billing you:

${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// =============================================================================
// Concierge cancel — one honest note from a human at gardener@thecros.app
// =============================================================================
// Not a save-flow. Not a discount offer. One short email asking the
// only question that matters: was something broken, or is it just not
// the season? Link to the data-export URL so they leave with their
// bytes exactly as the manifesto promised.
// =============================================================================

export function conciergeCancelEmail(opts: {
  to: string;
  displayName: string | null;
  exportLink: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Gracias — y una pregunta antes de despedirnos",
      text: `${greeting}

Vimos que canceló su cuenta de Communicare. Gracias por probar la
herramienta. Su acceso continúa hasta el fin del período que ya pagó,
y su exportación de datos está lista aquí:

${opts.exportLink}

Antes de que se vaya, una pregunta honesta: ¿algo estaba roto, o
simplemente no es la temporada? Cualquiera sea la respuesta ayuda —
si algo se rompió, lo arreglaremos antes de que le pase a otra granja.

Si quiere responder, solo responda este correo. Va a llegar a una
persona real, no a un bot.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Thank you — and one question before you go",
    text: `${greeting}

We saw you canceled your Communicare account. Thank you for trying
the tool. Your access runs through the end of the period you already
paid for, and your data export is waiting here:

${opts.exportLink}

Before you go, one honest question: was something broken, or is it
just not the season? Either answer helps us — if something broke, we'd
like to fix it before it happens to another farm.

To answer, just reply to this note. It goes to a person, not a bot.

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
