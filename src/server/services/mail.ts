import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export type Email = { to: string; subject: string; text: string };

const smtp =
  env.EMAIL_TRANSPORT === "smtp"
    ? {
        from: env.EMAIL_FROM,
        transporter: nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          // Port 465 is SMTP over TLS; other ports upgrade the connection with STARTTLS.
          secure: env.SMTP_PORT === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
        }),
      }
    : null;

export async function sendEmail(email: Email) {
  if (!smtp) {
    // Development: no mail account needed; codes and links show up in the server log.
    console.info(`[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}`);
    return;
  }
  await smtp.transporter.sendMail({ from: smtp.from, ...email });
}
