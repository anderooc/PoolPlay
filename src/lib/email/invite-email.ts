/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 */

import {
  appBaseUrl,
  emailFooterHtml,
  getResendClient,
  plainTextToHtml,
  tournamentEmailFromAddress,
} from "@/lib/email/resend";

export async function sendMemberInviteEmail(input: {
  to: string;
  token: string;
  inviterName: string;
  targetName: string;
  targetKind: "school" | "team";
}): Promise<void> {
  const inviteUrl = `${appBaseUrl()}/invite/${input.token}`;
  const signupUrl = `${appBaseUrl()}/signup?email=${encodeURIComponent(input.to)}&invite=${encodeURIComponent(input.token)}`;
  const targetLabel = input.targetKind === "school" ? "school" : "team";

  const subject = `${input.inviterName} invited you to join ${input.targetName} on brackt`;
  const body = `Hi,

${input.inviterName} invited you to join ${input.targetName} on brackt.

If you already have an account, open this link while signed in:
${inviteUrl}

If you're new to brackt, create an account first:
${signupUrl}

This invite expires in 14 days.`;

  const html = `${plainTextToHtml(body)}<p style="margin-top: 1.5em;"><a href="${inviteUrl}" style="color: #C93D2E; font-weight: 600;">Accept invite</a></p>${emailFooterHtml(input.targetName, `You received this because someone invited your email to a ${targetLabel} on brackt.`)}`;

  await getResendClient().emails.send({
    from: tournamentEmailFromAddress(),
    to: input.to,
    subject,
    html,
    text: body,
  });
}
