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
// Security & lifecycle alerts — password changed, pause/resume,
// payment failed, connect approved, member events, milestones
// =============================================================================
// Each of these has one narrow trigger, one honest paragraph, EN + ES.
// The security alerts (password changed, sign-in from new device) are
// standard "if this wasn't you, tell us" notices. The billing alerts
// are transactional confirmations, not marketing. The milestone
// alerts (first farm published, anniversary) are quiet celebrations.
// =============================================================================

// -----------------------------------------------------------------------------
// Password changed — successful /api/auth/reset completion
// -----------------------------------------------------------------------------

export function passwordChangedEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  ip?: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Su contraseña de Communicare cambió",
      text: `${greeting}

Cambiaron la contraseña de su cuenta de Communicare${opts.ip ? ` (desde ${opts.ip})` : ""}.

Si fue usted, no necesita hacer nada.

Si no fue usted, escriba de inmediato a ${SUPPORT_EMAIL} y cierre
sesión en todos los dispositivos aquí: ${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Your Communicare password changed",
    text: `${greeting}

Your Communicare account password was just changed${opts.ip ? ` (from ${opts.ip})` : ""}.

If it was you, no need to do anything.

If it wasn't you, write ${SUPPORT_EMAIL} right away and sign out of
every device at ${dash}/farmer/settings/.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Subscription paused / resumed — transactional confirmations
// -----------------------------------------------------------------------------

export function subscriptionPausedEmail(opts: {
  to: string;
  displayName: string | null;
  resumeDate: string | null;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const resumeLine = opts.resumeDate ? opts.resumeDate.slice(0, 10) : null;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Su granja está pausada",
      text: `${greeting}

Pausamos su suscripción de Communicare.
${resumeLine ? `Se reanudará automáticamente el ${resumeLine}.` : "Reanude cuando quiera desde la configuración."}

Durante la pausa: sin facturas, sin textos automáticos, y el panel
queda en solo lectura. Cuando esté listo:
${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Your farm desk is paused",
    text: `${greeting}

We've paused your Communicare subscription.
${resumeLine ? `It resumes automatically on ${resumeLine}.` : "Resume it whenever you're ready from settings."}

While paused: no bills, no automatic texts, and the dashboard is
read-only. When you're ready:
${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

export function subscriptionResumedEmail(opts: {
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
      subject: "Bienvenido de vuelta",
      text: `${greeting}

Su suscripción está activa otra vez. El escritorio, la línea de
mensajes, y todo lo demás vuelven a funcionar.

${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Welcome back",
    text: `${greeting}

Your subscription is active again. The desk, the SMS line, and
everything else are back on.

${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Payment failed — Stripe invoice.payment_failed webhook
// -----------------------------------------------------------------------------

export function paymentFailedEmail(opts: {
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
      subject: "Su tarjeta no pasó — vamos a intentar otra vez",
      text: `${greeting}

Su banco rechazó el cargo mensual de nueve dólares. Suele ser una
tarjeta vencida o un límite temporal. Stripe volverá a intentar en
unos días. Si prefiere actualizar la tarjeta ahora:

${dash}/farmer/settings/

Si en dos semanas no cobramos, pausamos su granja (los textos y el
sitio quedan en solo lectura hasta que resolvamos).

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Your card didn't go through — we'll try again",
    text: `${greeting}

Your bank declined the monthly nine-dollar charge. Usually an
expired card or a temporary hold. Stripe will retry in a few days;
if you'd rather fix the card now:

${dash}/farmer/settings/

If we can't collect within two weeks, your farm desk pauses (texts
and site go read-only until we sort it out).

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Card expiring soon — Stripe's expiring event
// -----------------------------------------------------------------------------

export function cardExpiringEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  brandLast4?: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const which = opts.brandLast4 ? ` on ${opts.brandLast4}` : "";
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: "Su tarjeta vence pronto",
      text: `${greeting}

Su tarjeta${which} vence este mes. Actualícela para que el próximo
cobro no falle:

${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: "Your card expires soon",
    text: `${greeting}

Your card${which} expires this month. Update it so next month's
charge goes through:

${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Stripe Connect approved — Managed Payments unlocked
// -----------------------------------------------------------------------------

export function connectApprovedEmail(opts: {
  to: string;
  displayName: string | null;
  farmName: string;
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
      subject: "${opts.farmName} — Managed Payments está listo",
      text: `${greeting}

Stripe aprobó su cuenta de Connect. ${opts.farmName} ya puede cobrar
tarjetas y ACH a través de Communicare. Nuestra tarifa de plataforma
del 1% se descuenta sobre el volumen procesado — nada más.

${dash}/farmer/payments/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${opts.farmName} — Managed Payments is live`,
    text: `${greeting}

Stripe approved your Connect account. ${opts.farmName} can now take
cards and ACH through Communicare. Our 1% platform fee comes off the
processed volume — no other charges.

${dash}/farmer/payments/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// New member joined — inbound SMS YES from a member
// -----------------------------------------------------------------------------

export function newMemberJoinedEmail(opts: {
  to: string;
  displayName: string | null;
  memberPhone: string;
  memberName: string | null;
  farmName: string;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const who = opts.memberName || opts.memberPhone;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${who} se unió a la línea de ${opts.farmName}`,
      text: `${greeting}

${who} respondió SÍ al mensaje de consentimiento. Está en la lista
oficial de miembros que reciben el texto del martes.

${dash}/farmer/sms/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${who} joined ${opts.farmName}'s SMS line`,
    text: `${greeting}

${who} replied YES to the consent text. They're on the roster for
next Tuesday's message.

${dash}/farmer/sms/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Member opted out — inbound STOP
// -----------------------------------------------------------------------------

export function memberOptedOutEmail(opts: {
  to: string;
  displayName: string | null;
  memberPhone: string;
  memberName: string | null;
  farmName: string;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const who = opts.memberName || opts.memberPhone;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${who} se dio de baja del SMS`,
      text: `${greeting}

${who} respondió BASTA/STOP y se dio de baja de los textos. Ya no
recibirá el mensaje del martes. Puede seguir siendo miembro de
${opts.farmName} — solo no por SMS.

${dash}/farmer/sms/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${who} left the SMS line`,
    text: `${greeting}

${who} replied STOP and opted out of texts. They won't get next
Tuesday's message. They can still be a member of ${opts.farmName} —
just not by SMS.

${dash}/farmer/sms/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// First farm published — milestone
// -----------------------------------------------------------------------------

export function firstFarmPublishedEmail(opts: {
  to: string;
  displayName: string | null;
  farmName: string;
  farmSlug: string;
  siteUrl: string;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const publicUrl = `${dash}/farm/${opts.farmSlug}/`;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${opts.farmName} está en vivo`,
      text: `${greeting}

Publicó el sitio de ${opts.farmName}. Ya lo puede compartir con sus
vecinos:

${publicUrl}

Copie el enlace en su perfil de Instagram, imprímalo en la esquina
del cartel del puesto, o envíelo por correo a la gente que suele
preguntar.

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${opts.farmName} is live`,
    text: `${greeting}

You published ${opts.farmName}'s site. You can share it with
neighbors now:

${publicUrl}

Drop the link in your Instagram bio, print it on the corner of your
farm-stand poster, or send it to the neighbors who always ask.

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// Anniversary — one year since signup
// -----------------------------------------------------------------------------

export function anniversaryEmail(opts: {
  to: string;
  displayName: string | null;
  siteUrl: string;
  yearNumber: number;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const y = opts.yearNumber;
  const yl = y === 1 ? "un año" : `${y} años`;
  const yg = y === 1 ? "one year" : `${y} years`;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${yl} con Communicare`,
      text: `${greeting}

Hace ${yl} que llegó a Communicare. Gracias por seguir con nosotros.

Si algo se rompió en el camino, o si algo debería funcionar
diferente, respóndanos este correo — llega a una persona.

Su granja: ${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${yg} with Communicare`,
    text: `${greeting}

It's been ${yg} since you joined Communicare. Thank you for staying.

If anything's broken, or if something should work differently, reply
to this note — it lands with a person.

Your desk: ${dash}/farmer/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// -----------------------------------------------------------------------------
// End-of-season summary — for veg CSAs (October), meat farms (November)
// -----------------------------------------------------------------------------

export function endOfSeasonEmail(opts: {
  to: string;
  displayName: string | null;
  farmName: string;
  siteUrl: string;
  weeksOffered: number;
  membersServed: number;
  totalReplies: number;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${opts.farmName} — resumen de la temporada`,
      text: `${greeting}

La temporada terminó en ${opts.farmName}. Lo que hicieron juntos:

  • ${opts.weeksOffered} semanas de porciones enviadas
  • ${opts.membersServed} miembros servidos
  • ${opts.totalReplies} conversaciones por SMS

¿Va a pausar hasta la próxima temporada? Configúrelo aquí sin bajarse:
${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${opts.farmName} — the season's numbers`,
    text: `${greeting}

Your season wrapped at ${opts.farmName}. What you did together:

  • ${opts.weeksOffered} weeks of shares sent out
  • ${opts.membersServed} members served
  • ${opts.totalReplies} SMS conversations

Pausing until next season? Set the resume date here so you don't
have to remember:
${dash}/farmer/settings/

${CLOSING_BLESSING}
— Communicare
`,
  };
}

// =============================================================================
// Herd-share monthly compliance reminder
// =============================================================================
// State milk-test schedules and contract-renewal dates vary; the safe
// move is a monthly nudge to CHECK, not a schedule we might get wrong.
// The farmer is the authority on their state's rules.
// =============================================================================

export function herdShareReminderEmail(opts: {
  to: string;
  displayName: string | null;
  farmName: string;
  siteUrl: string;
  herdshareState: string | null;
  locale?: Locale;
}): SendArgs {
  const name = opts.displayName?.trim() || null;
  const greeting = name ? `Hi ${name} —` : "Hi —";
  const dash = opts.siteUrl.replace(/\/+$/, "");
  const state = opts.herdshareState?.toUpperCase() || null;
  const locale: Locale = opts.locale === "es" ? "es" : "en";
  if (locale === "es") {
    return {
      to: opts.to,
      subject: `${opts.farmName} — recordatorio mensual del herd share`,
      text: `${greeting}

Un recordatorio mensual para su granja de leche cruda:

  • ¿Su prueba de leche del mes actual está al día?
  • ¿Todos los miembros nuevos firmaron el contrato de herd share?
  • ¿Hay tarifas de cuidado (boarding) próximas a renovar?

${state ? `Las reglas de ${state} pueden variar; usted es la autoridad sobre lo que aplica a su rebaño.` : "Las reglas varían por estado; usted es la autoridad sobre lo que aplica a su rebaño."}

Panel del herd share: ${dash}/farmer/herd-share/

${CLOSING_BLESSING}
— Communicare
`,
    };
  }
  return {
    to: opts.to,
    subject: `${opts.farmName} — monthly herd-share check-in`,
    text: `${greeting}

Monthly reminder for your raw-milk farm:

  • Is this month's milk test on file?
  • Did every new member sign the herd-share contract?
  • Any boarding fees coming up for renewal?

${state ? `${state}'s rules may differ from what we know; you're the authority on your herd.` : "State rules vary; you're the authority on what applies to your herd."}

Herd-share desk: ${dash}/farmer/herd-share/

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
