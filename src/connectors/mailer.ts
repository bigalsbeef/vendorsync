import nodemailer from "nodemailer";

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };

export type MailMessage = {
  to: string;
  cc?: string;
  replyTo?: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
};

export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

/**
 * Sends mail through SMTP when configured; otherwise logs the message and
 * reports it as a dry run so the app stays usable in development.
 */
export async function sendMail(msg: MailMessage): Promise<{ sent: boolean; messageId?: string; info: string }> {
  if (!smtpConfigured()) {
    console.info("[mailer] SMTP not configured – dry run", {
      to: msg.to,
      subject: msg.subject,
      attachments: msg.attachments?.map((a) => a.filename),
    });
    return { sent: false, info: "SMTP is not configured; email was logged but not sent." };
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const result = await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: msg.to,
    cc: msg.cc,
    replyTo: msg.replyTo,
    subject: msg.subject,
    text: msg.text,
    attachments: msg.attachments,
  });
  return { sent: true, messageId: result.messageId, info: `Sent (message id ${result.messageId})` };
}
