/**
 * Pure invite-code rules. Sign-up is gated by single-use, revocable codes held
 * in D1; this module owns the decisions (normalize, redeemability, generation)
 * so they're unit-testable without a database. The auth gate and the
 * invite server actions feed it rows.
 */

/** The redemption-relevant columns of an invite row. */
export type InviteRedemptionState = {
  usedAt: Date | number | null;
  revokedAt: Date | number | null;
};

// Crockford-style alphabet: no 0/1/O/I/L to keep codes unambiguous when typed.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

/** Canonical form for storage and comparison: trimmed, uppercased. */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * A code can be redeemed only if it exists, has never been used, and hasn't
 * been revoked. Missing row (unknown code) → not redeemable.
 */
export function isInviteRedeemable(
  invite: InviteRedemptionState | null | undefined,
): boolean {
  if (!invite) return false;
  if (invite.revokedAt != null) return false;
  if (invite.usedAt != null) return false;
  return true;
}

/**
 * A fresh, hard-to-guess single-use code, e.g. `LH-7QK4MX2P`. Uses the Web
 * Crypto CSPRNG (available on Workers and in Node test runs) — never Math.random.
 */
export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let body = "";
  for (const byte of bytes) {
    body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `LH-${body}`;
}
