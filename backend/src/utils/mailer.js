const nodemailer = require('nodemailer');

let transporter;

const getEmailProvider = () => (process.env.EMAIL_PROVIDER || 'smtp').trim().toLowerCase();
const canLogDevelopmentCodes = () =>
  process.env.EMAIL_DEV_LOG_CODES === 'true' && process.env.NODE_ENV !== 'production';

function isProviderConfigured() {
  switch (getEmailProvider()) {
    case 'smtp':
      return Boolean(process.env.SMTP_HOST);
    case 'resend':
      return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
    case 'dev':
      return process.env.NODE_ENV !== 'production';
    default:
      return false;
  }
}

const isEmailConfigured = () => isProviderConfigured() || canLogDevelopmentCodes();

function getTransporter() {
  if (getEmailProvider() !== 'smtp' || !process.env.SMTP_HOST) return null;

  if (!transporter) {
    const host = process.env.SMTP_HOST.trim();
    const port = Number(process.env.SMTP_PORT) || 587;
    let pass = process.env.SMTP_PASS || '';
    // Google shows App Passwords as "abcd efgh ijkl mnop"; Gmail wants them without spaces
    if (/gmail\.com$/i.test(host)) pass = pass.replace(/\s+/g, '');

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL from the start, 587 = upgrades with STARTTLS
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER.trim(), pass } : undefined,
      // Local development only: some antivirus programs (Avast Mail Shield) re-sign mail connections with a certificate
      // Node does not trust. SMTP_ALLOW_UNTRUSTED_CERT=true skips the certificate check, and is ignored in production.
      tls: process.env.SMTP_ALLOW_UNTRUSTED_CERT === 'true' && process.env.NODE_ENV !== 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return transporter;
}

async function resendRequest(path, options = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Resend API returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.code = 'ERESEND';
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function explainMailError(error) {
  if (error?.code === 'ERESEND') {
    if (error.status === 401 || error.status === 403) {
      return 'Resend rejected the API key. Check RESEND_API_KEY and make sure it is active.';
    }
    if (error.status === 422) {
      return 'Resend rejected the sender or recipient. Verify the sending domain in Resend and check MAIL_FROM.';
    }
    return 'Check the Resend API key, verified sender domain, and Resend service status.';
  }

  const errorCode = error?.code || error?.cause?.code;
  if (
    ['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT'].includes(errorCode) ||
    /self-signed certificate/i.test(error?.message || '')
  ) {
    return 'The network is presenting an untrusted TLS certificate. Do not disable certificate verification; trust the network inspection certificate or use the development fallback.';
  }

  switch (error?.code) {
    case 'EAUTH':
      return 'The email server rejected SMTP_USER / SMTP_PASS. For Gmail, turn on 2-Step Verification and use an App Password (not your normal password).';
    case 'ECONNECTION':
    case 'ESOCKET':
    case 'ETIMEDOUT':
    case 'EDNS':
      return 'Could not reach the email server. Check SMTP_HOST and SMTP_PORT, your internet connection, and that antivirus/firewall is not blocking the port.';
    case 'EENVELOPE':
      return 'The sender or recipient address was refused. Check MAIL_FROM (for Gmail it must be your own Gmail address).';
    default:
      if (['ECONNECTION', 'ESOCKET', 'ETIMEDOUT', 'EDNS'].includes(error?.cause?.code)) {
        return 'Could not reach the email server. Check your network, firewall, and SMTP host/port.';
      }
      return 'Check the email settings in backend/.env, then run: npm run test-email -- your.address@example.com';
  }
}

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// Wording for each kind of code email
const CODE_EMAILS = {
  login: {
    devLabel: 'Login code',
    subject: (code) => `${code} is your Lanka Women E-Market login code`,
    intro: 'Your login code is:',
    si: 'ඔබේ login කේතය:',
    ta: 'உங்கள் உள்நுழைவுக் குறியீடு:',
    ignore: "If you didn't try to log in, you can ignore this email.",
  },
  'password-reset': {
    devLabel: 'Password reset code',
    subject: (code) => `${code} is your Lanka Women E-Market password reset code`,
    intro: 'To choose a new password, enter this code:',
    si: 'ඔබේ මුරපදය යළි පිහිටුවීමේ කේතය:',
    ta: 'உங்கள் கடவுச்சொல்லை மீட்டமைக்கும் குறியீடு:',
    ignore: "If you didn't ask to reset your password, you can ignore this email. Your password will not change.",
  },
  'verify-email': {
    devLabel: 'Email verification code',
    subject: (code) => `${code} is your Lanka Women E-Market verification code`,
    intro: 'Welcome! To finish creating your account, enter this code:',
    si: 'ඔබේ ගිණුම තහවුරු කිරීමේ කේතය:',
    ta: 'உங்கள் கணக்கை உறுதிப்படுத்தும் குறியீடு:',
    ignore: "If you didn't create an account, you can ignore this email.",
  },
  'email-change': {
    devLabel: 'New-email code',
    subject: (code) => `${code} is your code to confirm your new email`,
    intro: 'To make this your new email address on Lanka Women E-Market, enter this code:',
    si: 'ඔබේ නව email තහවුරු කිරීමේ කේතය:',
    ta: 'உங்கள் புதிய மின்னஞ்சலை உறுதிப்படுத்தும் குறியீடு:',
    ignore: "If you didn't ask to change your email, you can ignore this email. Nothing will change.",
  },
};

async function sendLoginCode({ to, businessName, code, minutes, purpose = 'login' }) {
  const wording = CODE_EMAILS[purpose];
  const name = escapeHtml(businessName || 'Seller');
  const message = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: wording.subject(code),
    text: [
      `Hello ${businessName || 'Seller'},`,
      '',
      `${wording.intro} ${code}`,
      `It is valid for ${minutes} minutes and can be used once.`,
      '',
      `${wording.si} ${code}`,
      `${wording.ta} ${code}`,
      '',
      wording.ignore,
      '',
      'Lanka Women E-Market',
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1e293b">
        <div style="background:#14693d;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
          <strong style="font-size:18px">Lanka Women E-Market</strong>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 12px 12px">
          <p>Hello ${name},</p>
          <p>${wording.intro}</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#14693d;margin:16px 0">${code}</p>
          <p>It is valid for ${minutes} minutes and can be used once.</p>
          <p style="color:#475569">${wording.si} <strong>${code}</strong><br>${wording.ta} <strong>${code}</strong></p>
          <p style="color:#94a3b8;font-size:13px">${wording.ignore}</p>
        </div>
      </div>`,
  };

  const logDevelopmentCode = () => {
    console.info(`[DEV EMAIL] ${wording.devLabel} for ${to}: ${code} (valid ${minutes} minutes)`);
    return { emailed: false };
  };

  if (getEmailProvider() === 'dev') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The development email provider is disabled in production.');
    }
    return logDevelopmentCode();
  }

  if (!isProviderConfigured()) {
    if (canLogDevelopmentCodes()) return logDevelopmentCode();
    throw new Error(`Email provider "${getEmailProvider()}" is not configured.`);
  }

  try {
    if (getEmailProvider() === 'resend') {
      await resendRequest('/emails', { method: 'POST', body: JSON.stringify(message) });
    } else {
      const transport = getTransporter();
      await transport.sendMail(message);
    }
  } catch (error) {
    if (!canLogDevelopmentCodes()) throw error;
    console.warn(`[DEV EMAIL FALLBACK] ${explainMailError(error)}`);
    return logDevelopmentCode();
  }

  return { emailed: true };
}

async function verifyConnection() {
  if (!isProviderConfigured()) {
    throw new Error(`Email provider "${getEmailProvider()}" is not configured.`);
  }

  if (getEmailProvider() === 'dev') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('The development email provider is disabled in production.');
    }
    return;
  }

  if (getEmailProvider() === 'resend') {
    await resendRequest('/domains?limit=1');
    return;
  }

  const transport = getTransporter();
  await transport.verify();
}

module.exports = { getEmailProvider, isEmailConfigured, sendLoginCode, verifyConnection, explainMailError };
