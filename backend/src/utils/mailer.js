const nodemailer = require('nodemailer');

// Email settings come from backend/.env (see .env.example):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// If SMTP_HOST is not set, login codes are printed in the backend terminal instead,
// so you can test the login while developing.
// Check your settings with:  npm run test-email -- your.address@example.com

let transporter;

const isEmailConfigured = () => Boolean(process.env.SMTP_HOST);

function getTransporter() {
  if (!isEmailConfigured()) return null;

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
    });
  }
  return transporter;
}

// Turns common SMTP errors into a hint you can act on
function explainMailError(error) {
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
      return 'Check the SMTP settings in backend/.env, then run: npm run test-email -- your.address@example.com';
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
  const transport = getTransporter();
  const wording = CODE_EMAILS[purpose];

  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured, so login codes cannot be emailed.');
    }
    console.log(`\n[DEV] Email is not set up (no SMTP_HOST in backend/.env).`);
    console.log(`[DEV] ${wording.devLabel} for ${to}: ${code}  (valid ${minutes} minutes)\n`);
    return { emailed: false };
  }

  const name = escapeHtml(businessName || 'Seller');

  await transport.sendMail({
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
  });

  return { emailed: true };
}

// Logs in to the email server without sending anything (used by `npm run test-email`)
async function verifyConnection() {
  const transport = getTransporter();
  if (!transport) throw new Error('SMTP_HOST is not set in backend/.env');
  await transport.verify();
}

module.exports = { isEmailConfigured, sendLoginCode, verifyConnection, explainMailError };
