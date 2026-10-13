// Checks the email (SMTP) settings in backend/.env and sends a test login-code email.
// Run it in the backend folder:
//   npm run test-email -- your.address@example.com

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { getEmailProvider, isEmailConfigured, verifyConnection, sendLoginCode, explainMailError } = require('../src/utils/mailer');

const to = process.argv[2];

(async () => {
  if (!isEmailConfigured()) {
    console.log('✗ Email is not set up for the selected provider in backend/.env.');
    console.log('  See backend/.env.example for SMTP, Resend, and local development settings.');
    process.exit(1);
  }

  const endpoint =
    getEmailProvider() === 'smtp'
      ? `${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`
      : getEmailProvider();
  console.log(`Checking ${endpoint} ...`);
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
    const result = await sendLoginCode({ to, businessName: 'Test', code: '123456', minutes: 10 });
    console.log(
      result.emailed
        ? `✓ Test email sent to ${to} (check the inbox and the spam folder)`
        : '✓ Development fallback logged the test code in this terminal'
    );
  } catch (error) {
    console.log(`✗ ${error.message}`);
    console.log(`  Hint: ${explainMailError(error)}`);
    process.exit(1);
  }
})();
