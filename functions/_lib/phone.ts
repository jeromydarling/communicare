// =============================================================================
// phone — E.164 normalization for US numbers
// =============================================================================
// Every phone number in the SMS subsystem is stored in E.164 (+15551234567).
// Twilio requires it on the wire and inbound webhook From/To values
// arrive in that shape — so we normalize at the boundary and never
// store anything else.
//
// Scope is intentionally US-only for now. Communicare's farmer + member
// base is US-only and Twilio 10DLC compliance is US-specific. When a
// non-US member opts in, we'll surface that as an explicit error rather
// than guess at the country code.
//
// What we accept:
//   "(540) 555-1234"  →  "+15405551234"
//   "540-555-1234"    →  "+15405551234"
//   "540.555.1234"    →  "+15405551234"
//   "5405551234"      →  "+15405551234"
//   "+1 540 555 1234" →  "+15405551234"
//   "15405551234"     →  "+15405551234"
//
// What we reject:
//   "+44 ..."         →  null (UK)
//   "555-1234"        →  null (no area code)
//   "1234567"         →  null (too short)
// =============================================================================

const US_AREA_CODE_RE = /^[2-9]/;  // US area codes never start with 0 or 1

export function normalizeUsPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D+/g, "");
  if (digits.length === 0) return null;

  // Strip a leading "1" country code if present
  const ten = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  if (ten.length !== 10) return null;
  if (!US_AREA_CODE_RE.test(ten)) return null;

  return `+1${ten}`;
}

// For UI display: "(540) 555-1234" from "+15405551234".
export function formatUsPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (!m) return e164;
  return `(${m[1]}) ${m[2]}-${m[3]}`;
}

// Masked for logs: "+1•••5551234" so we can correlate without leaking
// the full number into log search indexes.
export function maskPhone(e164: string): string {
  if (e164.length < 8) return e164;
  return e164.slice(0, 3) + "•••" + e164.slice(-4);
}
