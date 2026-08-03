// Outbound email. Uses Resend's HTTP API via fetch — no extra dependency.
//
// Configure with two environment variables:
//   RESEND_API_KEY  — from resend.com
//   MAIL_FROM       — e.g. "Trip Desk <no-reply@yourdomain.com>" (the domain
//                     must be verified in Resend, or delivery will be rejected)
//
// If RESEND_API_KEY isn't set, nothing is sent: the message is logged to the
// server console instead, so a locked-out admin can still recover the link from
// the deployment logs. send() reports which path was taken rather than
// pretending success.

export type SendResult = { delivered: boolean; reason?: string };

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Trip Desk <onboarding@resend.dev>";

  if (!key) {
    console.warn(
      `[mail] RESEND_API_KEY is not set — email NOT sent.\n` +
      `[mail] to: ${opts.to}\n[mail] subject: ${opts.subject}\n[mail] ${opts.text}`,
    );
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[mail] Resend rejected the message (${res.status}): ${detail}`);
      return { delivered: false, reason: `provider_error_${res.status}` };
    }
    return { delivered: true };
  } catch (e) {
    console.error("[mail] send failed:", e instanceof Error ? e.message : e);
    return { delivered: false, reason: "network_error" };
  }
}

// The password-reset email. Plain and unbranded on purpose — it must be legible
// in every client, and it never contains the password itself.
export function resetEmail(name: string, link: string) {
  const subject = "Reset your Trip Desk password";
  const text =
    `Hi ${name},\n\n` +
    `Someone asked to reset the password for your Trip Desk account.\n\n` +
    `Open this link to choose a new one (it expires in 1 hour and works once):\n${link}\n\n` +
    `If this wasn't you, ignore this email — your password stays as it is.`;
  const html =
    `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;color:#1b1c2b;line-height:1.6">
      <p>Hi ${escapeHtml(name)},</p>
      <p>Someone asked to reset the password for your Trip Desk account.</p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#5b50e6;color:#fff;padding:11px 20px;border-radius:9px;text-decoration:none;font-weight:600">Choose a new password</a></p>
      <p style="color:#5a5d74;font-size:13px">This link expires in 1 hour and can only be used once.<br>
      If the button doesn't work, paste this into your browser:<br>
      <span style="word-break:break-all">${escapeHtml(link)}</span></p>
      <p style="color:#5a5d74;font-size:13px">If this wasn't you, just ignore this email — your password stays as it is.</p>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
