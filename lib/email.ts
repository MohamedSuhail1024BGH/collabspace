import nodemailer, { type Transporter } from "nodemailer";

interface SendOtpOptions {
  to: string;
  code: string;
  purpose: "signup" | "password_reset";
  userName?: string;
}

let cachedTransporter: Transporter | null = null;

function getEmailTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  // 1. Check for Gmail Direct Configuration
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

  // 2. Check for Standard SMTP Configuration
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

  // 3. Check for Resend SMTP
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

  return null;
}

export async function sendOtpEmail({
  to,
  code,
  purpose,
  userName,
}: SendOtpOptions): Promise<{ delivered: boolean; error?: string; devMode?: boolean }> {
  const isSignup = purpose === "signup";
  const subject = isSignup
    ? `${code} is your CollabSpace verification code`
    : `${code} is your CollabSpace password reset code`;

  const title = isSignup ? "Verify your email address" : "Reset your password";
  const description = isSignup
    ? "Thank you for joining CollabSpace. Please use the verification code below to complete your account registration."
    : "We received a request to reset your CollabSpace password. Please enter the verification code below to proceed.";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0c0d0e; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #16171a; border: 1px solid #282a30; border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header / Brand -->
          <tr>
            <td align="left" style="padding-bottom: 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #10b981; border-radius: 8px; width: 32px; height: 32px; text-align: center; vertical-align: middle;">
                    <span style="color: #000000; font-weight: 800; font-size: 18px; line-height: 32px; display: block;">C</span>
                  </td>
                  <td style="padding-left: 10px;">
                    <span style="color: #ffffff; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: -0.5px;">collab<span style="color: #3ecf8e;">space</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Greeting & Description -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">${title}</h1>
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">
                ${userName ? `Hello ${userName},<br><br>` : ""}${description}
              </p>
            </td>
          </tr>

          <!-- OTP Code Box -->
          <tr>
            <td align="center" style="padding: 24px 0;">
              <div style="background-color: #0d0e11; border: 1px dashed #3ecf8e; border-radius: 12px; padding: 18px 24px; text-align: center; display: inline-block;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #3ecf8e; display: block; margin-left: 8px;">${code}</span>
              </div>
              <p style="margin: 12px 0 0; font-size: 12px; color: #71717a; font-family: monospace;">This code expires in 10 minutes</p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding-top: 16px; border-top: 1px solid #282a30;">
              <p style="margin: 0 0 8px; font-size: 12px; line-height: 18px; color: #71717a;">
                If you did not request this verification code, please ignore this email or reach out to support. No changes have been made to your account.
              </p>
              <p style="margin: 0; font-size: 11px; color: #52525b; font-family: monospace;">
                &copy; ${new Date().getFullYear()} CollabSpace Inc. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const textContent = `
${title}

${userName ? `Hello ${userName},\n\n` : ""}${description}

Your 6-digit verification code: ${code}
(Expires in 10 minutes)

If you did not request this, you can safely ignore this email.
CollabSpace Team
`.trim();

  const transporter = getEmailTransporter();

  // Always output prominently to terminal console for development & debugging visibility
  console.log("\n=======================================================");
  console.log(`✉️  [CollabSpace OTP Delivery]`);
  console.log(`   To:       ${to}`);
  console.log(`   Purpose:  ${purpose}`);
  console.log(`   Code:     ${code}`);
  console.log(`   Expires:  10 minutes`);
  if (!transporter) {
    console.log(`   Status:   Dev mode (No SMTP configured - check .env.local to send live emails)`);
  }
  console.log("=======================================================\n");

  if (!transporter) {
    // If no real SMTP is configured yet in .env.local, return dev mode indicator so user can still test seamlessly
    return { delivered: true, devMode: true };
  }

  const sender =
    process.env.SMTP_FROM ||
    process.env.GMAIL_USER ||
    '"CollabSpace Security" <no-reply@collabspace.app>';

  try {
    await transporter.sendMail({
      from: sender,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    return { delivered: true, devMode: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Email] Failed to send email via transporter:", errorMsg);
    // In development or if network blocks, do not completely brick the UI
    return { delivered: false, error: errorMsg, devMode: true };
  }
}
