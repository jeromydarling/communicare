// =============================================================================
// crypto — password hashing + token generation
// =============================================================================
// Uses Web Crypto (SubtleCrypto), built into Workers. No deps, no
// nodejs_compat needed.
//
// Password hash format (PHC-ish):
//   pbkdf2-sha256$<iterations>$<salt-b64>$<hash-b64>
//
// PBKDF2 with 100,000 iterations of SHA-256. OWASP 2023 recommends
// 600,000 for defense-in-depth, but Cloudflare Workers' SubtleCrypto
// caps at 100,000 (any higher throws
// "iteration counts above 100000 are not supported"). The stored hash
// records the iteration count, so we can raise this ceiling later —
// verify() reads whatever count is in each row.
//
// At 100k iterations + a 16-byte per-user salt, a leaked DB still
// makes offline brute-force costly (~10ms/attempt on commodity GPUs).
// Fine at launch scale; upgrade to argon2id when CF exposes it.
// =============================================================================

const PBKDF2_ITERATIONS = 100_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;
const SESSION_BYTES = 32;
const TOKEN_BYTES = 32;

// -----------------------------------------------------------------------------
// Random helpers — CSPRNG for sessions, tokens, salts
// -----------------------------------------------------------------------------

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function bytesToB64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64UrlToBytes(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = (s + "=".repeat(pad)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function newSessionId(): string {
  return bytesToB64Url(randomBytes(SESSION_BYTES));
}

export function newToken(): string {
  return bytesToB64Url(randomBytes(TOKEN_BYTES));
}

// -----------------------------------------------------------------------------
// SHA-256 of a session/token string. We store the hash in the DB; the
// plaintext only lives in cookies / emails / URLs.
// -----------------------------------------------------------------------------

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -----------------------------------------------------------------------------
// Password hashing — PBKDF2-SHA256
// -----------------------------------------------------------------------------

export async function hashPassword(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derivePbkdf2(plaintext, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${bytesToB64Url(salt)}$${bytesToB64Url(key)}`;
}

export async function verifyPassword(
  plaintext: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = b64UrlToBytes(parts[2]);
  const expected = b64UrlToBytes(parts[3]);
  const actual = await derivePbkdf2(plaintext, salt, iterations);
  return constantTimeEqual(expected, actual);
}

async function derivePbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// -----------------------------------------------------------------------------
// Password strength check — same rule the frontend already enforces
// (PasswordInput component). Re-check server-side so a client-side bypass
// can't get past it.
// -----------------------------------------------------------------------------

export function isPasswordStrongEnough(password: string): boolean {
  if (password.length < 12) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  // At least three of four classes (lower, upper, digit, special)
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  return classes >= 3;
}
