// =============================================================================
// redirects — same-origin redirect_to validation
// =============================================================================
// Magic-link and invite tokens carry a `redirect_to` field so the user
// lands back where they were trying to go. Naive validation (just
// `.startsWith("/")`) lets a protocol-relative URL like `//evil.com/x`
// slip through — browsers normalize `https://communicare.farm` + `//evil.com/x`
// to `https://evil.com/x`, turning the system into an open-redirect.
//
// `isSafeRedirect` returns the input unchanged when it's a single-slash
// same-origin path, else returns the fallback. Reject criteria:
//   - doesn't start with "/"
//   - starts with "//" (protocol-relative)
//   - starts with "/\" (rare browser quirk, treated as absolute by some)
//   - longer than 256 chars (defensive)
// =============================================================================

export function isSafeRedirect(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//") || s.startsWith("/\\")) return null;
  if (s.length > 256) return null;
  return s;
}

export function safeRedirectOr(value: unknown, fallback: string): string {
  return isSafeRedirect(value) ?? fallback;
}
