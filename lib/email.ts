/**
 * CollabSpace Email Service
 * 
 * NOTE: Account registration and verification emails are managed directly
 * by Supabase Auth (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * 
 * If you wish to configure a custom email transporter for custom application
 * emails, you only need ONE of the following sets of credentials (all are optional):
 * 
 * 1. Gmail:
 *    - GMAIL_USER: your email address
 *    - GMAIL_APP_PASSWORD: your 16-character Google App password
 * 
 * 2. Resend:
 *    - RESEND_API_KEY: your Resend API key
 * 
 * 3. Custom SMTP:
 *    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer, { type Transporter } from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

let cachedTransporter: Transporter | null = null;

export function getEmailTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  // 1. Gmail Direct Transport
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
  if (gmailUser && gmailPass) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
    return cachedTransporter;
  }

  // 2. Resend Transport
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: resendKey,
      },
    });
    return cachedTransporter;
  }

  // 3. Standard SMTP Transport
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    return cachedTransporter;
  }

  return null;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailOptions): Promise<{ delivered: boolean; error?: string }> {
  const transporter = getEmailTransporter();

  if (!transporter) {
    // Graceful no-op when running purely on Supabase Auth
    console.warn(
      `[Email] No custom SMTP configured. Authentication emails are handled by Supabase Auth.`
    );
    return { delivered: true };
  }

  const sender =
    process.env.SMTP_FROM ||
    process.env.GMAIL_USER ||
    '"CollabSpace" <no-reply@collabspace.app>';

  try {
    await transporter.sendMail({
      from: sender,
      to,
      subject,
      text: text || "",
      html: html || undefined,
    });
    return { delivered: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Transporter error:", errorMsg);
    return { delivered: false, error: errorMsg };
  }
}
