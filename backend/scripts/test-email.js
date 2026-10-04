// Checks the email (SMTP) settings in backend/.env and sends a test login-code email.
// Run it in the backend folder:
//   npm run test-email -- your.address@example.com

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { isEmailConfigured, verifyConnection, sendLoginCode, explainMailError } = require('../src/utils/mailer');

const to = process.argv[2];

(async () => {
  if (!isEmailConfigured()) {
    console.log('✗ Email is not set up: SMTP_HOST is missing in backend/.env');
    console.log('  Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM (see backend/.env.example).');
    process.exit(1);
  }

  console.log(`Connecting to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER || '(no user)'} ...`);
  try {
    await verifyConnection();
    console.log('✓ Logged in to the email server');
  } catch (error) {
    console.log(`✗ ${error.message}`);
    console.log(`  Hint: ${explainMailError(error)}`);
    process.exit(1);
  }

  if (!to) {
    console.log('To also send a test email, run: npm run test-email -- your.address@example.com');
    return;
  }

  try {
    await sendLoginCode({ to, businessName: 'Test', code: '123456', minutes: 10 });
    console.log(`✓ Test email sent to ${to} (check the inbox and the spam folder)`);
  } catch (error) {
    console.log(`✗ ${error.message}`);
    console.log(`  Hint: ${explainMailError(error)}`);
    process.exit(1);
  }
})();
