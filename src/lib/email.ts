import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// On Resend's free tier, you can only send from onboarding@resend.dev
// Once you verify your domain in Resend, update this to your own address
const FROM_EMAIL = "Job Tracker <onboarding@resend.dev>";

export async function sendInviteEmail({
  to,
  inviterName,
  companyName,
  role,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteUrl: string;
}) {
  const roleLabel = role.replace("_", " ");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to join ${companyName} on Job Tracker`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">You're invited!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          ${inviterName} has invited you to join <strong>${companyName}</strong> as a <strong>${roleLabel}</strong> on Job Tracker.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
          Accept invite
        </a>
        <p style="color: #94a3b8; font-size: 13px;">
          Or copy this link into your browser:<br/>
          <span style="color: #64748b; word-break: break-all;">${inviteUrl}</span>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          Job Tracker — Profitability tracking for service businesses
        </p>
      </div>
    `,
  });

  return { error: error ? error.message : null };
}
