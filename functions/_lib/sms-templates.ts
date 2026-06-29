// =============================================================================
// sms-templates — message bodies for the Tuesday loop
// =============================================================================
// Three kinds of message right now, each EN + ES:
//   1. consentRequest    — sent on first opt-in. We need a YES reply
//                          before any other text goes out.
//   2. weeklyOffer        — the Tuesday text. Names the share, the
//                          window, and the four keywords.
//   3. reply ack          — what we send back after we resolve a reply
//                          (confirm/skip/swap/gift/pause).
//
// Voice rule: Communicare's editorial register translated into text-message
// length. Plain, warm, no marketing-speak. Federal HELP/STOP boilerplate
// is appended via the keyword handlers, not these templates.
//
// Length: each composed body stays under 320 chars to fit in 2 SMS segments
// (single-segment ASCII is 160, GSM-7 with extended chars effectively ~150).
// Long farm names or long share names can push us over; that's acceptable
// (Twilio segments transparently) but worth keeping in mind.
// =============================================================================

import { CLOSING_BLESSING } from "../../lib/brand-strings";

type Locale = "en" | "es";

// -----------------------------------------------------------------------------
// 1. Consent request — sent on first opt-in
// -----------------------------------------------------------------------------

export function consentRequestText(args: {
  farmName: string;
  locale?: Locale;
}): string {
  const locale = args.locale ?? "en";
  if (locale === "es") {
    return `${args.farmName} quiere enviarle un mensaje cada semana para confirmar su porción. Responda SÍ para suscribirse, BASTA para no recibir más. (No cobramos por SMS; tarifas de su operador pueden aplicar.)`;
  }
  return `${args.farmName} would like to text you each week to confirm this week's share. Reply YES to subscribe, STOP to opt out. (No charge from us; your carrier's rates may apply.)`;
}

// -----------------------------------------------------------------------------
// 2. Weekly offer — the Tuesday text
// -----------------------------------------------------------------------------

export function weeklyOfferText(args: {
  farmName: string;
  shareSummary?: string; // freeform line like "This week: lettuce, beets, garlic scapes"
  pickupHint?: string;   // "Pickup Saturday 9-noon at the farm"
  replyByHint?: string;  // "Reply by Wed 10am."
  locale?: Locale;
}): string {
  const locale = args.locale ?? "en";
  const lines: string[] = [];

  if (locale === "es") {
    lines.push(`${args.farmName}: su porción de esta semana.`);
    if (args.shareSummary) lines.push(args.shareSummary);
    if (args.pickupHint) lines.push(args.pickupHint);
    lines.push("Responda: SÍ para confirmar, OMITIR para saltar, PAUSAR para pausar, o reglar un cambio.");
    if (args.replyByHint) lines.push(args.replyByHint);
  } else {
    lines.push(`${args.farmName}: this week's share.`);
    if (args.shareSummary) lines.push(args.shareSummary);
    if (args.pickupHint) lines.push(args.pickupHint);
    lines.push("Reply: YES to confirm, SKIP to skip, PAUSE for the season, or tell us a swap.");
    if (args.replyByHint) lines.push(args.replyByHint);
  }
  return lines.join(" ");
}

// -----------------------------------------------------------------------------
// 3. Reply ack — what we say back after we resolve a reply
// -----------------------------------------------------------------------------

export function replyAck(args: {
  intent: "confirm" | "skip" | "swap" | "gift" | "pause" | "resume" | "help" | "stop" | "unknown";
  farmName: string;
  detail?: string;        // for swap: "lettuce → broccoli". for gift: "to Mary".
  locale?: Locale;
}): string {
  const locale = args.locale ?? "en";
  const F = args.farmName;
  if (locale === "es") {
    switch (args.intent) {
      case "confirm": return `Confirmado. ${F} le verá esta semana.`;
      case "skip":    return `Anotado — saltamos esta semana. ${F} le escribirá el próximo martes.`;
      case "swap":    return `Hecho: ${args.detail ?? "intercambio anotado"}. Hasta el día de recogida.`;
      case "gift":    return `Hecho: ${args.detail ?? "regalo anotado"}. ${F} se asegurará de que llegue.`;
      case "pause":   return `Pausa anotada. No le escribiremos hasta que diga REANUDAR.`;
      case "resume":  return `Bienvenida de vuelta. Le escribiremos el próximo martes.`;
      case "help":    return `Responda SÍ para confirmar, OMITIR para saltar, PAUSAR para pausar, BASTA para darse de baja. Escriba al granjero para todo lo demás.`;
      case "stop":    return `Recibido. No le enviaremos más mensajes. Si cambia de opinión, responda START.`;
      default:        return `Recibimos su mensaje. Si necesita ayuda escriba al granjero, o responda AYUDA.`;
    }
  }
  switch (args.intent) {
    case "confirm": return `Confirmed. ${F} will see you this week.`;
    case "skip":    return `Noted — skipping this week. ${F} will write next Tuesday.`;
    case "swap":    return `Done: ${args.detail ?? "swap noted"}. See you on pickup day.`;
    case "gift":    return `Done: ${args.detail ?? "gift noted"}. ${F} will make sure it gets there.`;
    case "pause":   return `Pause noted. No more texts until you say RESUME.`;
    case "resume":  return `Welcome back. We'll text again next Tuesday.`;
    case "help":    return `Reply YES to confirm, SKIP to skip, PAUSE to pause, STOP to unsubscribe. Write the farmer directly for anything else.`;
    case "stop":    return `Got it. We won't text you again. If you change your mind, reply START.`;
    default:        return `We got your message. If you need help write the farmer, or reply HELP.`;
  }
}

// -----------------------------------------------------------------------------
// 4. Farmer test send — used by /api/farmer/sms/send-test
// -----------------------------------------------------------------------------

export function farmerTestText(args: { farmName: string }): string {
  return `Communicare test from ${args.farmName}. If you can see this, the SMS line is alive. ${CLOSING_BLESSING}`;
}
