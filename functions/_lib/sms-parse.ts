// =============================================================================
// sms-parse — intent extraction from inbound text bodies
// =============================================================================
// Two layers:
//
//   1. parseIntent(body) — strict, no-LLM keyword detection. Handles
//      the federal-required keywords (STOP, HELP, START), the simple
//      action keywords (YES, SKIP, PAUSE, RESUME), and the regex-
//      capturable SWAP/GIFT cases. Always runs first.
//
//   2. parseIntentSmart(body, env) — falls back to Workers AI (Llama)
//      when the regex parser returns 'unknown'. Llama is asked to
//      classify into one of the known intents and extract structured
//      slots (out/in for swap, name for gift). Behind a feature gate
//      so we can ship without it.
//
// We accept English + Spanish keywords throughout. Capitalization is
// ignored. Punctuation around keywords is tolerated ("YES!", "Skip.").
//
// The keyword precedence matters: STOP/HELP/START are checked first
// because CTIA requires those keywords to work regardless of context,
// even mid-conversation. We never let a "stop" inside a longer reply
// get reinterpreted as something else.
// =============================================================================

export type ParsedIntent = {
  intent:
    | "confirm" | "skip" | "swap" | "gift"
    | "pause" | "resume"
    | "stop" | "help" | "start"
    | "unknown";
  // Structured slots — populated only for the intents that need them.
  swap?: { out: string; in: string };
  gift?: { recipientName?: string; recipientPhone?: string };
  // The raw input, lower-cased + trimmed, for the caller's audit.
  normalized: string;
  // Did the LLM weigh in? Useful for logs + future feedback loops.
  smart?: boolean;
};

// -----------------------------------------------------------------------------
// Strict (regex-only) parser
// -----------------------------------------------------------------------------

const KW = {
  // STOP family — must always win
  stop: /\b(stop|unsubscribe|end|quit|cancel|basta|para|cancelar)\b/,
  start: /\b(start|begin|comenzar|empezar)\b/,
  help: /\b(help|info|ayuda)\b/,

  // Action keywords
  yes: /\b(yes|y|yeah|yep|yup|confirm|confirmar|si|sí)\b/,
  skip: /\b(skip|skipping|omit|saltar|omitir)\b/,
  pause: /\b(pause|pausa|pausar|hold)\b/,
  resume: /\b(resume|reanudar|continuar|continue|reactivate)\b/,

  // Swap & gift — the keyword presence; slot extraction below
  swap: /\b(swap|trade|change|substitute|intercambiar|cambiar)\b/,
  gift: /\b(gift|give|deliver to|regalar|dar)\b/,
};

const SWAP_RE = /\b(?:swap|trade|change|substitute|intercambiar|cambiar)\s+(?:the\s+|my\s+)?([\p{L}\p{N} '\-]{2,40}?)\s+(?:for|to|with|por|a)\s+(?:the\s+|some\s+)?([\p{L}\p{N} '\-]{2,40}?)(?:[.!?]|$)/iu;
const GIFT_RE = /\b(?:gift|give|regalar|dar)\s+(?:this\s+|it\s+)?(?:to|a)\s+([\p{L} '\-]{2,40}?)(?:[.!?]|$)/iu;
// E.164 or "ten-digit-with-or-without-1" — used to capture an optional phone after a gift
const PHONE_RE = /(\+?1?\s*\(?[2-9]\d{2}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;

export function parseIntent(rawBody: string): ParsedIntent {
  const normalized = rawBody.trim().toLowerCase();
  if (!normalized) return { intent: "unknown", normalized };

  // STOP / START / HELP — non-negotiable precedence.
  if (KW.stop.test(normalized)) return { intent: "stop", normalized };
  if (KW.start.test(normalized)) return { intent: "start", normalized };
  if (KW.help.test(normalized)) return { intent: "help", normalized };

  // Specific actions before generic ones (pause before yes; swap before
  // skip in case someone writes "skip the lettuce — swap for kale").
  if (KW.pause.test(normalized)) return { intent: "pause", normalized };
  if (KW.resume.test(normalized)) return { intent: "resume", normalized };

  // Swap with slot extraction
  if (KW.swap.test(normalized)) {
    const m = SWAP_RE.exec(normalized);
    if (m) {
      return {
        intent: "swap",
        swap: { out: m[1].trim(), in: m[2].trim() },
        normalized,
      };
    }
    // Keyword present but slots not extractable — kick to smart parser
    return { intent: "unknown", normalized };
  }

  // Gift with recipient extraction
  if (KW.gift.test(normalized)) {
    const m = GIFT_RE.exec(normalized);
    if (m) {
      const phoneMatch = PHONE_RE.exec(rawBody);
      return {
        intent: "gift",
        gift: {
          recipientName: m[1].trim(),
          recipientPhone: phoneMatch ? phoneMatch[1].trim() : undefined,
        },
        normalized,
      };
    }
    return { intent: "unknown", normalized };
  }

  if (KW.skip.test(normalized)) return { intent: "skip", normalized };
  if (KW.yes.test(normalized)) return { intent: "confirm", normalized };

  return { intent: "unknown", normalized };
}

// -----------------------------------------------------------------------------
// Smart fallback — Workers AI Llama for natural-language SWAP / GIFT
// -----------------------------------------------------------------------------
// Only called when strict parser returns 'unknown' AND the body looks
// like it might be a swap or gift attempt. Keeps the AI call count
// down (paid per neuron-hour); 95%+ of replies are CONFIRM / SKIP /
// STOP, which never reach this code path.
//
// Strict JSON schema response — no prose, no hallucinated intents.
// =============================================================================

const SMART_SYSTEM = `You are a parser for SMS replies to a small farm's weekly text. The member is replying about their share for the week.

Classify the message into exactly one intent:
- "confirm": they want this week's share (yes, sure, sounds good)
- "skip": they don't want this week (no, skip me, can't this week)
- "swap": they want to substitute one item for another (swap X for Y)
- "gift": they want to give this week's share to someone (give it to Mary)
- "pause": they want to pause for an extended period
- "resume": they want to come back after a pause
- "help": they're asking how this works
- "unknown": none of the above; could be a question or comment for the farmer

For "swap", extract { out: "what they're removing", in: "what they want instead" }.
For "gift", extract { recipientName: "the name they mentioned" }.

Return JSON only. No prose.`;

type SmartEnv = {
  AI?: Ai;
  AI_GATEWAY_URL?: string;
  AI_GATEWAY_TOKEN?: string;
};

export async function parseIntentSmart(
  rawBody: string,
  env: SmartEnv,
): Promise<ParsedIntent> {
  // First, the regex pass. If it succeeds, we don't pay for inference.
  const strict = parseIntent(rawBody);
  if (strict.intent !== "unknown") return strict;
  if (!env.AI) return strict;

  // Only escalate to LLM if the body has at least one promising token,
  // so a chatty "hi how are you" doesn't burn a neuron-hour.
  if (!/swap|trade|change|substitute|gift|give|regalar|cambiar|intercambiar|deliver/i.test(rawBody)) {
    return strict;
  }

  try {
    const res = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: SMART_SYSTEM },
        { role: "user", content: rawBody.slice(0, 600) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          schema: {
            type: "object",
            properties: {
              intent: {
                type: "string",
                enum: ["confirm","skip","swap","gift","pause","resume","help","unknown"],
              },
              swap: {
                type: "object",
                properties: {
                  out: { type: "string" },
                  in: { type: "string" },
                },
              },
              gift: {
                type: "object",
                properties: {
                  recipientName: { type: "string" },
                },
              },
            },
            required: ["intent"],
          },
        },
      },
    });

    const out = (res as { response?: unknown }).response;
    const parsed = typeof out === "string" ? JSON.parse(out) : out;
    if (!parsed || typeof parsed !== "object" || !("intent" in parsed)) return strict;

    const intent = (parsed as { intent: ParsedIntent["intent"] }).intent;
    if (!intent) return strict;
    return {
      intent,
      swap: (parsed as { swap?: ParsedIntent["swap"] }).swap,
      gift: (parsed as { gift?: ParsedIntent["gift"] }).gift,
      normalized: strict.normalized,
      smart: true,
    };
  } catch (err) {
    console.warn("parseIntentSmart failed:", err);
    return strict;
  }
}
