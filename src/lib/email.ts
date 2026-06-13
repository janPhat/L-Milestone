// Transactional email via the Resend HTTP API — plain fetch (no SDK), which
// runs on the Cloudflare Workers runtime. Best-effort: failures are logged and
// swallowed so a flaky email never breaks sign-up or reveals whether an address
// exists. RESEND_API_KEY is a Worker secret; RESEND_FROM is optional.

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

const DEFAULT_FROM = "L Health <onboarding@resend.dev>";

export async function sendEmail(
  env: CloudflareEnv | undefined,
  { to, subject, html }: SendEmailArgs,
): Promise<void> {
  const apiKey = env?.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY not set — skipped send to", to);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: env?.RESEND_FROM ?? DEFAULT_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend responded", res.status, await res.text());
    }
  } catch (err) {
    console.error("[email] Resend request failed", err);
  }
}

function layout(heading: string, body: string, cta: { href: string; label: string }): string {
  return `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2b2620">
  <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
  <p style="font-size:14px;line-height:1.6;color:#555">${body}</p>
  <p style="margin:24px 0"><a href="${cta.href}" style="background:#2b2620;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;display:inline-block">${cta.label}</a></p>
  <p style="font-size:12px;color:#999">If you didn't request this, you can ignore this email.</p>
</div>`;
}

export function resetPasswordEmail(name: string, url: string): string {
  return layout(
    "Reset your password",
    `Hi ${name || "there"}, tap the button below to set a new L Health password. This link expires shortly.`,
    { href: url, label: "Reset password" },
  );
}

export function verifyEmail(name: string, url: string): string {
  return layout(
    "Verify your email",
    `Hi ${name || "there"}, confirm this is your email for L Health.`,
    { href: url, label: "Verify email" },
  );
}
