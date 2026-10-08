// Adds an admin (Ministry staff) account. There is no public admin sign-up page:
// only someone who can run commands in this backend folder can add admins.
// The new admin then logs in at /admin/login with their email + NIC + the emailed code.
//
// Usage (in the backend folder):
//   npm run add-admin -- --name "Kumari Silva" --email kumari@example.com --nic 198012345678 --phone 0771234567
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

// Same rules as the website (authController.js)
const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USAGE = 'Usage: npm run add-admin -- --name "Full Name" --email name@example.com --nic 198012345678 --phone 0771234567';

function readArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const option = argv[i].match(/^--(name|email|nic|phone)$/);
    if (option) args[option[1]] = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(`Could not add the admin: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const fullName = args.name?.trim();
  const email = args.email?.trim();
  const nicNumber = args.nic?.trim().toUpperCase();
  const phone = String(args.phone || '').replace(/[\s-]/g, '');

  const problems = [];
  if (!fullName) problems.push('--name is missing');
  if (!email || !EMAIL_PATTERN.test(email)) problems.push('--email is missing or not a valid email address');
  if (!nicNumber || !NIC_PATTERN.test(nicNumber)) problems.push('--nic must be 12 digits, or 9 digits followed by V or X');
  if (!PHONE_PATTERN.test(phone)) problems.push('--phone must be a phone number such as 0771234567');
  if (problems.length > 0) {
    fail(`\n - ${problems.join('\n - ')}\n\n${USAGE}`);
    return;
  }

  const taken = await prisma.user.findFirst({
    where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] }
  });
  if (taken) return fail('this email or phone number is already used by another account.');
  if (await prisma.adminProfile.findUnique({ where: { nicNumber } })) {
    return fail('this NIC number already has an admin account.');
  }

  // Admins log in with email + NIC + emailed code, so the password is a random one nobody knows
  await prisma.user.create({
    data: {
      email,
      phone,
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
      adminProfile: { create: { fullName, nicNumber } }
    }
  });

  console.log(`Admin account added for ${fullName} (${email}).`);
  console.log('They can now log in at /admin/login with this email and NIC number.');
}

main()
  .catch((error) => fail(error.message))
  .finally(() => prisma.$disconnect());
