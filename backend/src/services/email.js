const FROM = `${process.env.EMAIL_FROM_NAME || 'SkillTech Hub'} <${process.env.EMAIL_FROM || 'noreply@skilltechhub.com'}>`;

// Lazy-initialize Resend so missing key doesn't crash on startup
function getResend() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — emails will be logged only');
    return null;
  }
  const { Resend } = require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail({ to, subject, html }) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email:DEV] To: ${to} | Subject: ${subject}`);
    return { id: 'dev-mode' };
  }
  return resend.emails.send({ from: FROM, to, subject, html });
}

async function sendWelcomeEmail({ email, firstName, verifyToken }) {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
  return sendEmail({
    to: email,
    subject: 'Welcome to SkillTech Hub — Verify Your Email',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0a0a1a;color:#fff;border-radius:12px">
        <h1 style="color:#6366f1">Welcome to SkillTech Hub, ${firstName}! 🚀</h1>
        <p>You're one step away from accessing world-class tech education.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Verify Email Address
        </a>
        <p style="color:#aaa;font-size:13px">Link expires in 24 hours. If you didn't register, ignore this email.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({ email, firstName, resetToken }) {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  return sendEmail({
    to: email,
    subject: 'SkillTech Hub — Password Reset',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0a0a1a;color:#fff;border-radius:12px">
        <h2 style="color:#6366f1">Password Reset Request</h2>
        <p>Hi ${firstName}, click below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#aaa;font-size:13px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

async function sendClassReminder({ email, first_name, title, sessionId, timeLabel }) {
  const joinUrl = `${process.env.CLIENT_URL}/live/${sessionId}`;
  return sendEmail({
    to: email,
    subject: `⏰ "${title}" starts in ${timeLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0a0a1a;color:#fff;border-radius:12px">
        <h2 style="color:#6366f1">Your live class starts soon!</h2>
        <p>Hi ${first_name}, <strong>${title}</strong> starts in <strong>${timeLabel}</strong>.</p>
        <a href="${joinUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Join Class Now
        </a>
      </div>
    `,
  });
}

async function sendCertificateEmail({ email, firstName, courseTitle, pdfUrl, verifyUrl }) {
  return sendEmail({
    to: email,
    subject: `🎓 Your Certificate for "${courseTitle}" is Ready!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#0a0a1a;color:#fff;border-radius:12px">
        <h2 style="color:#6366f1">Congratulations, ${firstName}! 🎉</h2>
        <p>You've completed <strong>${courseTitle}</strong> and earned your certificate.</p>
        <a href="${pdfUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:8px 8px 8px 0">
          Download Certificate
        </a>
        <a href="${verifyUrl}" style="display:inline-block;background:transparent;border:2px solid #6366f1;color:#6366f1;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
          Verify Online
        </a>
      </div>
    `,
  });
}

module.exports = { sendEmail, sendWelcomeEmail, sendPasswordResetEmail, sendClassReminder, sendCertificateEmail };
