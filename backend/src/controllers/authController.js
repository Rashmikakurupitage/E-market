const crypto = require('crypto');
const dns = require('dns').promises;
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpStore = require('../utils/otpStore');
const nicVault = require('../utils/nicVault');
const { parseNic } = require('../utils/nicInfo');
const { sendLoginCode, explainMailError, isEmailConfigured } = require('../utils/mailer');

// Catch a wrong email before anything is sent: bad shape, a likely typo of a popular domain, or a domain that cannot receive mail
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gnail.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'hotmial.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com'
};
const checkEmailAddress = async (email) => {
  if (!EMAIL_SHAPE.test(email) || email.length > 254) return { code: 'EMAIL_INVALID' };
  const domain = email.split('@')[1].toLowerCase();
  if (DOMAIN_TYPOS[domain]) return { code: 'EMAIL_TYPO', suggestion: email.split('@')[0] + '@' + DOMAIN_TYPOS[domain] };
  if ((process.env.EMAIL_PROVIDER || '').toLowerCase() === 'dev') return null; // local testing has no real mail domains
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return null;
  } catch (error) {
    if (!['ENOTFOUND', 'ENODATA'].includes(error.code)) return null; // lookup trouble: do not block the person
  }
  try {
    await dns.resolve4(domain); // no MX record: mail falls back to the domain's own address
    return null;
  } catch (error) {
    return ['ENOTFOUND', 'ENODATA'].includes(error.code) ? { code: 'EMAIL_INVALID' } : null;
  }
};

// Admin accounts must never be created through public sign-up
const SELF_SERVICE_ROLES = ['CUSTOMER', 'SELLER'];

// Old NIC: 9 digits + V/X (e.g. 858470123V). New NIC: 12 digits (e.g. 198584700123)
const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;
const SELF_SERVICE_PASSWORD_MIN_LENGTH = 8;
// At least 8 characters, one capital letter, and one number or symbol
const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= SELF_SERVICE_PASSWORD_MIN_LENGTH &&
  /[A-Z]/.test(password) &&
  /[^A-Za-z]/.test(password);
const makeSelfServiceNic = (role) => `SELF-${role}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
const normalizeOptionalUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const signToken = (user, expiresIn = '7d') =>
  jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn }
  );

// Never send passwordHash back to the browser
// NIC data (even encrypted) never leaves the server in a login or profile response
const withoutNic = (profile) => {
  if (!profile) return profile;
  const { nicNumber, nicHash, nicEncrypted, ...safe } = profile;
  return safe;
};

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profile: withoutNic(user.sellerProfile || user.customerProfile || user.adminProfile),
  // Changes whenever the profile photo changes (null = no photo), so browsers reload it
  photoVersion: user.profilePhoto ? user.profilePhoto.updatedAt.getTime() : null
});

// Auto-capitalize the first letter of each word in names (e.g. "kamal" -> "Kamal")
const capitalizeName = (value) => {
  if (!value) return '';
  return String(value)
    .trim()
    .split(/(\s+|[-'])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '-' || part === "'") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

// 1. User Registration
exports.register = async (req, res) => {
  try {
    const {
      email,
      phone,
      password,
      fullName,
      firstName,
      lastName,
      businessName,
      district,
      whatsappNo,
      description,
      messengerUrl,
      facebookUrl
    } = req.body;
    const role = req.body.role || 'CUSTOMER';
    const nicNumberInput = req.body.nicNumber?.trim().toUpperCase();
    const rawProvidedFullName = String(req.body.customerFullName || fullName || '').trim();
    let rawFirstName = String(firstName || '').trim();
    let rawLastName = String(lastName || '').trim();
    if (!rawFirstName && !rawLastName && rawProvidedFullName) {
      const parts = rawProvidedFullName.split(/\s+/);
      rawFirstName = parts[0] || '';
      rawLastName = parts.slice(1).join(' ') || '';
    }
    const profileFirstName = capitalizeName(rawFirstName);
    const profileLastName = capitalizeName(rawLastName);
    const customerFullName = [profileFirstName, profileLastName].filter(Boolean).join(' ') || (rawProvidedFullName ? capitalizeName(rawProvidedFullName) : 'Customer');

    if (!email || !phone) {
      return res.status(400).json({ message: 'Email සහ Phone අංකය අවශ්‍ය වේ.' });
    }

    if (!SELF_SERVICE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'අවලංගු ගිණුම් වර්ගයකි.' });
    }

    const emailProblem = await checkEmailAddress(email);
    if (emailProblem) {
      return res.status(400).json({ ...emailProblem, message: 'The email address looks incorrect.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password must have at least 8 characters, one capital letter, and one number or symbol.'
      });
    }

    if ((firstName !== undefined || lastName !== undefined) && (!profileFirstName || !profileLastName)) {
      return res.status(400).json({ message: 'First name සහ Last name අවශ්‍ය වේ.' });
    }

    // Sellers must give a valid NIC (it is stored encrypted). Customers never give one.
    if (role === 'SELLER' && !nicVault.isValidNic(nicNumberInput)) {
      return res.status(400).json({ code: 'INVALID_NIC', message: 'Enter a valid NIC number: 12 digits, or 9 digits followed by V or X.' });
    }
    // Only women can sell here: the NIC number shows the gender and the birth date
    const nicInfo = role === 'SELLER' ? parseNic(nicNumberInput) : null;
    if (role === 'SELLER' && !nicInfo.valid) {
      return res.status(400).json({ code: 'INVALID_NIC', message: 'This NIC number is not valid. Please check it.' });
    }
    if (nicInfo?.gender === 'male') {
      return res.status(403).json({ code: 'WOMEN_ONLY', message: 'Only women can register as sellers.' });
    }
    const normalizedNicNumber = makeSelfServiceNic(role);
    const sellerMessengerUrl = normalizeOptionalUrl(messengerUrl);
    const sellerFacebookUrl = normalizeOptionalUrl(facebookUrl);

    // The code has to be emailed, so sign-up needs working email
    if (!isEmailConfigured()) {
      return res.status(503).json({ code: 'SMTP_NOT_CONFIGURED', message: 'Email delivery is not configured on the server.' });
    }

    // A sign-up that was never verified (abandoned, or a mistyped email) must not block the same email, phone or NIC.
    // Very old unverified accounts are cleared out as well.
    await prisma.user.deleteMany({ where: { emailVerifiedAt: null, role: { in: SELF_SERVICE_ROLES }, createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } } });
    const existingUsers = await prisma.user.findMany({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] },
      select: { id: true, emailVerifiedAt: true }
    });
    if (existingUsers.some((existing) => existing.emailVerifiedAt)) {
      return res.status(400).json({ message: 'Email හෝ Phone අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }
    if (existingUsers.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: existingUsers.map((existing) => existing.id) } } });
    }

    const nicData = role === 'SELLER' ? nicVault.protect(nicNumberInput) : null;
    if (nicData) {
      const holder = await prisma.sellerProfile.findUnique({ where: { nicHash: nicData.nicHash }, select: { user: { select: { id: true, emailVerifiedAt: true } } } });
      if (holder?.user.emailVerifiedAt) {
        return res.status(409).json({ code: 'NIC_TAKEN', message: 'This NIC number is already registered.' });
      }
      if (holder) await prisma.user.delete({ where: { id: holder.user.id } }); // an unverified sign-up that used this NIC
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const profile =
      role === 'SELLER'
        ? {
            sellerProfile: {
              create: {
                businessName: businessName || 'My Business',
                district: district || 'Colombo',
                nicNumber: normalizedNicNumber,
                ...nicData,
                dateOfBirth: nicInfo ? new Date(`${nicInfo.birthDate}T00:00:00.000Z`) : null,
                firstName: profileFirstName || null,
                lastName: profileLastName || null,
                whatsappNo: whatsappNo || phone,
                messengerUrl: sellerMessengerUrl,
                facebookUrl: sellerFacebookUrl,
                description: description || null
              }
            }
          }
        : {
            customerProfile: {
              create: { fullName: customerFullName, nicNumber: normalizedNicNumber }
            }
          };

    const user = await prisma.user.create({
      data: { email, phone, passwordHash, role, ...profile },
      include: { sellerProfile: true, customerProfile: true }
    });

    // Email the 6-digit code. If it cannot be sent, undo the sign-up so the person can simply try again.
    const issued = otpStore.issue(verifyKey(user.id));
    try {
      await sendLoginCode({
        to: user.email,
        businessName: user.sellerProfile ? [profileFirstName, profileLastName].filter(Boolean).join(' ') || user.sellerProfile.businessName : customerFullName,
        code: issued.code,
        minutes: issued.expiresInMinutes,
        purpose: 'verify-email'
      });
    } catch (mailError) {
      otpStore.discard(verifyKey(user.id));
      await prisma.user.delete({ where: { id: user.id } });
      console.error('VERIFY_EMAIL_SEND_ERROR:', mailError.message);
      console.error('HINT:', explainMailError(mailError));
      // The mail server itself refused this recipient: the address does not exist
      if (mailError.rejected?.length || [550, 551, 553].includes(mailError.responseCode)) {
        return res.status(400).json({ code: 'EMAIL_INVALID', message: 'The email address looks incorrect.' });
      }
      return res.status(502).json({ code: 'EMAIL_FAILED', message: 'The verification email could not be sent. Please try again later.' });
    }

    res.status(201).json({
      verificationRequired: true,
      email: user.email,
      sentTo: maskEmail(user.email),
      expiresInMinutes: issued.expiresInMinutes,
      resendAfterSeconds: issued.resendAfterSeconds,
      ...(process.env.EMAIL_DEV_LOG_CODES === 'true' ? { devCode: issued.code } : {})
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Email, Phone හෝ NIC අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }
    console.error('REGISTRATION_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 2. User Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email සහ Password ඇතුළත් කරන්න.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { sellerProfile: true, customerProfile: true }
    });

    // Admins must use the admin login (email + NIC + emailed code)
    if (!user || user.role === 'SUPER_ADMIN') {
      return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'Email හෝ Password වැරදියි.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ code: 'INVALID_CREDENTIALS', message: 'Email හෝ Password වැරදියි.' });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', email: user.email, message: 'Please verify your email first.' });
    }

    if (user.sellerProfile?.removedAt) {
      return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This seller account has been removed.' });
    }
    if (user.removedAt) {
      return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This account has been removed.' });
    }

    res.json({
      message: 'සාර්ථකව Log විය!',
      token: signToken(user),
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('LOGIN_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// Sri Lankan phone number: 0771234567, 94771234567 or +94771234567
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

// --- Login with email + NIC, then a one-time code sent to that email (sellers, customers and admins) ---

// Shows "su****@gmail.com" so the user knows where the code went
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 2))}@${domain}`;
};

const findByEmailAndNic = (role, profile) => (email, nicNumber) =>
  prisma.user.findFirst({
    where: {
      role,
      removedAt: null,
      email: { equals: email, mode: 'insensitive' },
      [profile]: { is: { nicNumber: { equals: nicNumber, mode: 'insensitive' } } }
    },
    include: { [profile]: true }
  });

const LOGIN_TYPES = {
  seller: {
    find: findByEmailAndNic('SELLER', 'sellerProfile'),
    displayName: (user) => user.sellerProfile.businessName,
    notFound: { code: 'SELLER_NOT_FOUND', message: 'මෙම Email සහ NIC අංකයට ගැළපෙන ව්‍යවසායිකා ගිණුමක් නොමැත.' },
    sessionLength: '7d'
  },
  customer: {
    find: findByEmailAndNic('CUSTOMER', 'customerProfile'),
    displayName: (user) => user.customerProfile.fullName,
    notFound: { code: 'CUSTOMER_NOT_FOUND', message: 'මෙම Email සහ NIC අංකයට ගැළපෙන පාරිභෝගික ගිණුමක් නොමැත.' },
    sessionLength: '7d'
  },
  admin: {
    find: findByEmailAndNic('SUPER_ADMIN', 'adminProfile'),
    displayName: (user) => user.adminProfile.fullName,
    notFound: { code: 'ADMIN_NOT_FOUND', message: 'මෙම Email සහ NIC අංකයට ගැළපෙන පරිපාලක ගිණුමක් නොමැත.' },
    sessionLength: '8h' // admin sessions last one working day
  }
};

const readLoginDetails = (body) => ({
  email: body.email?.trim(),
  nicNumber: body.nicNumber?.trim().toUpperCase()
});

// Step 1 - check email + NIC and email a 6-digit code
const requestLoginCode = (type) => async (req, res) => {
  try {
    const { email, nicNumber } = readLoginDetails(req.body);

    if (!email || !nicNumber) {
      return res.status(400).json({ code: 'MISSING_DETAILS', message: 'Email සහ NIC අංකය ඇතුළත් කරන්න.' });
    }

    const user = await type.find(email, nicNumber);
    if (!user) {
      return res.status(404).json(type.notFound);
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: 'Please verify your email first.'
      });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        code: 'SMTP_NOT_CONFIGURED',
        message: 'Email delivery is not configured on the server.'
      });
    }

    const issued = otpStore.issue(user.id);
    if (issued.error === 'RESEND_TOO_SOON') {
      return res.status(429).json({ code: issued.error, retryAfter: issued.retryAfter, message: `තත්පර ${issued.retryAfter}කින් නැවත උත්සාහ කරන්න.` });
    }
    if (issued.error === 'TOO_MANY_CODES') {
      return res.status(429).json({ code: issued.error, message: 'ඉල්ලීම් වැඩියි. පැයකින් පසු නැවත උත්සාහ කරන්න.' });
    }

    let delivery;
    try {
      delivery = await sendLoginCode({
        to: user.email,
        businessName: type.displayName(user),
        code: issued.code,
        minutes: issued.expiresInMinutes
      });
    } catch (mailError) {
      otpStore.discard(user.id);
      console.error('LOGIN_CODE_EMAIL_ERROR:', mailError.message);
      console.error('HINT:', explainMailError(mailError));
      return res.status(502).json({ code: 'EMAIL_FAILED', message: 'Email එක යැවීමට නොහැකි විය. පසුව නැවත උත්සාහ කරන්න.' });
    }

    res.json({
      message: 'Login කේතය ඔබේ email වෙත යවන ලදී.',
      sentTo: delivery.emailed ? maskEmail(user.email) : null,
      emailed: delivery.emailed,
      expiresInMinutes: issued.expiresInMinutes,
      resendAfterSeconds: issued.resendAfterSeconds
    });
  } catch (error) {
    console.error('LOGIN_CODE_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// Step 2 - check the code and log in
const verifyLoginCode = (type) => async (req, res) => {
  try {
    const { email, nicNumber } = readLoginDetails(req.body);
    const code = String(req.body.code || '').trim();

    if (!email || !nicNumber || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ code: 'WRONG_CODE', message: 'ඉලක්කම් 6ක කේතය ඇතුළත් කරන්න.' });
    }

    const user = await type.find(email, nicNumber);
    if (!user) {
      return res.status(404).json(type.notFound);
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: 'Please verify your email first.'
      });
    }

    const result = otpStore.verify(user.id, code);
    if (result !== 'OK') {
      const messages = {
        NO_CODE: 'කරුණාකර නව කේතයක් ඉල්ලන්න.',
        CODE_EXPIRED: 'කේතය කල් ඉකුත් වී ඇත. නව කේතයක් ඉල්ලන්න.',
        WRONG_CODE: 'කේතය වැරදියි. නැවත උත්සාහ කරන්න.',
        TOO_MANY_ATTEMPTS: 'වැරදි උත්සාහයන් වැඩියි. නව කේතයක් ඉල්ලන්න.'
      };
      return res.status(400).json({ code: result, message: messages[result] });
    }

    res.json({
      message: 'සාර්ථකව Log විය!',
      token: signToken(user, type.sessionLength),
      user: toPublicUser(user)
    });
  } catch (error) {
    console.error('LOGIN_VERIFY_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// --- Email verification: the code emailed at sign-up proves the email address is the person's own ---

const verifyKey = (userId) => `verify:${userId}`;

const findUnverifiedUser = (email) =>
  prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, role: { in: SELF_SERVICE_ROLES }, emailVerifiedAt: null, removedAt: null },
    include: { sellerProfile: true, customerProfile: true }
  });

// Check the code, mark the email as verified, approve the account, and log the new user in
exports.verifyEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const code = String(req.body?.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ code: 'WRONG_CODE', message: 'Enter the 6-digit code.' });
    }

    const user = await findUnverifiedUser(email);
    if (!user) {
      const alreadyVerified = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, emailVerifiedAt: { not: null } }, select: { id: true } });
      return res.status(alreadyVerified ? 409 : 400).json({ code: alreadyVerified ? 'ALREADY_VERIFIED' : 'WRONG_CODE', message: alreadyVerified ? 'This email is already verified. Please log in.' : 'The code is not valid.' });
    }

    const result = otpStore.verify(verifyKey(user.id), code);
    if (result !== 'OK') {
      return res.status(400).json({ code: result, message: 'The code is not valid. Please ask for a new one.' });
    }

    const isSeller = user.role === 'SELLER';
    const updateData = {
      emailVerifiedAt: new Date(),
      ...(isSeller && user.sellerProfile
        ? { sellerProfile: { update: { status: 'APPROVED' } } }
        : {})
    };

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      include: { sellerProfile: true, customerProfile: true, profilePhoto: { select: { updatedAt: true } } }
    });

    res.json({
      message: isSeller
        ? 'Your email is verified and your seller account is approved!'
        : 'Your email is verified and your customer account is approved!',
      token: signToken(verified),
      user: toPublicUser(verified)
    });
  } catch (error) {
    console.error('VERIFY_EMAIL_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Send the code again (the same answer whether or not a waiting account exists)
exports.resendVerification = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      return res.status(400).json({ code: 'MISSING_DETAILS', message: 'Enter your email.' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ code: 'SMTP_NOT_CONFIGURED', message: 'Email delivery is not configured on the server.' });
    }

    const user = await findUnverifiedUser(email);
    if (user) {
      const issued = otpStore.issue(verifyKey(user.id));
      if (!issued.error) {
        try {
          await sendLoginCode({
            to: user.email,
            businessName: user.customerProfile?.fullName || [user.sellerProfile?.firstName, user.sellerProfile?.lastName].filter(Boolean).join(' ') || user.sellerProfile?.businessName,
            code: issued.code,
            minutes: issued.expiresInMinutes,
            purpose: 'verify-email'
          });
        } catch (mailError) {
          otpStore.discard(verifyKey(user.id));
          console.error('VERIFY_EMAIL_RESEND_ERROR:', mailError.message);
          console.error('HINT:', explainMailError(mailError));
        }
      }
    }

    res.json({ message: 'If this email is waiting to be verified, a new code has been sent.', expiresInMinutes: 10, resendAfterSeconds: 60 });
  } catch (error) {
    console.error('RESEND_VERIFICATION_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// --- Forgot password: an emailed code lets a customer or seller choose a new password ---

// Reset codes are kept apart from login codes
const resetKey = (userId) => `reset:${userId}`;

// Customers and sellers only (admins use their own login). Removed accounts cannot reset.
const findResettableUser = async (email) => {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, role: { in: ['CUSTOMER', 'SELLER'] }, removedAt: null },
    include: { sellerProfile: true, customerProfile: true }
  });
  return user && !user.sellerProfile?.removedAt ? user : null;
};

// Step 1 - email a 6-digit code. The answer is always the same, so nobody can use this to find out who is registered.
exports.requestPasswordReset = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    if (!email) {
      return res.status(400).json({ code: 'MISSING_DETAILS', message: 'Enter your email.' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ code: 'SMTP_NOT_CONFIGURED', message: 'Email delivery is not configured on the server.' });
    }

    const user = await findResettableUser(email);
    if (user) {
      const issued = otpStore.issue(resetKey(user.id));
      if (issued.error === 'RESEND_TOO_SOON') {
        return res.status(429).json({ code: issued.error, retryAfter: issued.retryAfter });
      }
      if (issued.error === 'TOO_MANY_CODES') {
        return res.status(429).json({ code: issued.error });
      }

      let delivery;
      const recipientName =
        [user.sellerProfile?.firstName, user.sellerProfile?.lastName].filter(Boolean).join(' ') ||
        user.sellerProfile?.businessName ||
        user.customerProfile?.fullName ||
        (user.role === 'CUSTOMER' ? 'Customer' : 'Seller');
      try {
        delivery = await sendLoginCode({
          to: user.email,
          businessName: recipientName,
          code: issued.code,
          minutes: issued.expiresInMinutes,
          purpose: 'password-reset'
        });
      } catch (mailError) {
        otpStore.discard(resetKey(user.id));
        console.error('PASSWORD_RESET_EMAIL_ERROR:', mailError.message);
        console.error('HINT:', explainMailError(mailError));
        return res.status(502).json({ code: 'EMAIL_FAILED', message: 'Could not send the password reset email.' });
      }

      return res.json({
        message: 'If this email is registered, a code has been sent to it.',
        sentTo: maskEmail(user.email),
        emailed: delivery.emailed,
        expiresInMinutes: issued.expiresInMinutes,
        resendAfterSeconds: issued.resendAfterSeconds,
        ...(process.env.EMAIL_DEV_LOG_CODES === 'true' ? { devCode: issued.code } : {})
      });
    }

    res.json({ message: 'If this email is registered, a code has been sent to it.', expiresInMinutes: 10, resendAfterSeconds: 60 });
  } catch (error) {
    console.error('PASSWORD_RESET_REQUEST_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Step 2 - check the code and save the new password
exports.resetPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim();
    const code = String(req.body?.code || '').trim();
    const newPassword = req.body?.newPassword;

    if (!email || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ code: 'WRONG_CODE', message: 'Enter the 6-digit code.' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ code: 'WEAK_PASSWORD', message: 'Password must have at least 8 characters, one capital letter, and one number or symbol.' });
    }

    const user = await findResettableUser(email);
    const result = user ? otpStore.verify(resetKey(user.id), code) : 'WRONG_CODE';
    if (result !== 'OK') {
      return res.status(400).json({ code: result, message: 'The code is not valid. Please ask for a new one.' });
    }

    const isSeller = user.role === 'SELLER';
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        ...(isSeller && user.sellerProfile && user.sellerProfile.status === 'PENDING'
          ? { sellerProfile: { update: { status: 'APPROVED' } } }
          : {})
      }
    });
    res.json({ message: 'Your password was changed. You can log in now.' });
  } catch (error) {
    console.error('PASSWORD_RESET_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.requestSellerLoginCode = requestLoginCode(LOGIN_TYPES.seller);
exports.verifySellerLoginCode = verifyLoginCode(LOGIN_TYPES.seller);
exports.requestCustomerLoginCode = requestLoginCode(LOGIN_TYPES.customer);
exports.verifyCustomerLoginCode = verifyLoginCode(LOGIN_TYPES.customer);
exports.requestAdminLoginCode = requestLoginCode(LOGIN_TYPES.admin);
exports.verifyAdminLoginCode = verifyLoginCode(LOGIN_TYPES.admin);

// The logged-in user's latest details (e.g. approval status for the dashboard)
exports.me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { sellerProfile: true, customerProfile: true, adminProfile: true, profilePhoto: { select: { updatedAt: true } } }
    });

    if (!user) {
      return res.status(401).json({ message: 'ගිණුම සොයාගත නොහැක. නැවත Log වන්න.' });
    }

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    console.error('ME_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// --- Change your own email or phone number (logged-in sellers and customers) ---

const ALL_PROFILES = { sellerProfile: true, customerProfile: true, adminProfile: true };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanPhone = (value) => String(value || '').replace(/[\s-]/g, '');
const nameOf = (user) =>
  user.sellerProfile?.businessName || user.customerProfile?.fullName || user.adminProfile?.fullName;

// The new email waiting for its code. The code itself is kept by otpStore under its own key,
// so login codes and email-change codes never mix, and the same "1 per minute, 5 per hour" limits apply.
const pendingEmails = new Map(); // userId -> new email
const emailChangeKey = (userId) => `email-change:${userId}`;

// Phone number, and for sellers the WhatsApp number customers order on.
// No code is needed: the user is logged in, and nothing here is used to log in.
exports.updatePhone = async (req, res) => {
  try {
    const phone = cleanPhone(req.body.phone);
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ code: 'INVALID_PHONE', message: 'දුරකථන අංකය වලංගු නොවේ.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: ALL_PROFILES });
    if (!user) {
      return res.status(401).json({ message: 'ගිණුම සොයාගත නොහැක. නැවත Log වන්න.' });
    }

    const data = { phone };
    if (user.role === 'SELLER') {
      const whatsappNo = req.body.whatsappNo === undefined ? phone : cleanPhone(req.body.whatsappNo);
      if (!PHONE_PATTERN.test(whatsappNo)) {
        return res.status(400).json({ code: 'INVALID_WHATSAPP', message: 'WhatsApp අංකය වලංගු නොවේ.' });
      }

      const messengerUrl = normalizeOptionalUrl(req.body.messengerUrl);
      const facebookUrl = normalizeOptionalUrl(req.body.facebookUrl);
      data.sellerProfile = {
        update: {
          whatsappNo,
          ...(messengerUrl !== null ? { messengerUrl } : {}),
          ...(facebookUrl !== null ? { facebookUrl } : {})
        }
      };
    }

    if (phone !== user.phone && (await prisma.user.findFirst({ where: { phone, NOT: { id: user.id } } }))) {
      return res.status(400).json({ code: 'PHONE_TAKEN', message: 'මෙම දුරකථන අංකය වෙනත් ගිණුමක් භාවිත කරයි.' });
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data, include: ALL_PROFILES });
    res.json({ message: 'දුරකථන අංකය යාවත්කාලීන කරන ලදී.', user: toPublicUser(updated) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ code: 'PHONE_TAKEN', message: 'මෙම දුරකථන අංකය වෙනත් ගිණුමක් භාවිත කරයි.' });
    }
    console.error('UPDATE_PHONE_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// Email step 1 - send a code to the NEW address, so a typo can't lock anyone out of their account
exports.requestEmailChangeCode = async (req, res) => {
  try {
    const newEmail = req.body.newEmail?.trim();
    if (!newEmail || !EMAIL_PATTERN.test(newEmail)) {
      return res.status(400).json({ code: 'INVALID_EMAIL', message: 'වලංගු email ලිපිනයක් ඇතුළත් කරන්න.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, include: ALL_PROFILES });
    if (!user) {
      return res.status(401).json({ message: 'ගිණුම සොයාගත නොහැක. නැවත Log වන්න.' });
    }
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return res.status(400).json({ code: 'SAME_EMAIL', message: 'මෙය දැනටමත් ඔබේ email ලිපිනයයි.' });
    }
    const taken = await prisma.user.findFirst({
      where: { email: { equals: newEmail, mode: 'insensitive' }, NOT: { id: user.id } }
    });
    if (taken) {
      return res.status(400).json({ code: 'EMAIL_TAKEN', message: 'මෙම email ලිපිනය වෙනත් ගිණුමක් භාවිත කරයි.' });
    }

    const key = emailChangeKey(user.id);
    const issued = otpStore.issue(key);
    if (issued.error === 'RESEND_TOO_SOON') {
      return res.status(429).json({ code: issued.error, retryAfter: issued.retryAfter, message: `තත්පර ${issued.retryAfter}කින් නැවත උත්සාහ කරන්න.` });
    }
    if (issued.error === 'TOO_MANY_CODES') {
      return res.status(429).json({ code: issued.error, message: 'ඉල්ලීම් වැඩියි. පැයකින් පසු නැවත උත්සාහ කරන්න.' });
    }

    let delivery;
    try {
      delivery = await sendLoginCode({
        to: newEmail,
        businessName: nameOf(user),
        code: issued.code,
        minutes: issued.expiresInMinutes,
        purpose: 'email-change'
      });
    } catch (mailError) {
      otpStore.discard(key);
      console.error('EMAIL_CHANGE_CODE_ERROR:', mailError.message);
      console.error('HINT:', explainMailError(mailError));
      return res.status(502).json({ code: 'EMAIL_FAILED', message: 'Email එක යැවීමට නොහැකි විය. පසුව නැවත උත්සාහ කරන්න.' });
    }

    pendingEmails.set(user.id, newEmail);
    res.json({
      message: 'තහවුරු කිරීමේ කේතය නව email ලිපිනයට යවන ලදී.',
      emailed: delivery.emailed,
      sentTo: delivery.emailed ? maskEmail(newEmail) : null,
      expiresInMinutes: issued.expiresInMinutes,
      resendAfterSeconds: issued.resendAfterSeconds
    });
  } catch (error) {
    console.error('EMAIL_CHANGE_REQUEST_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// Email step 2 - check the code, then switch the account to the new address
exports.verifyEmailChange = async (req, res) => {
  try {
    const userId = req.user.userId;
    const newEmail = req.body.newEmail?.trim();
    const code = String(req.body.code || '').trim();

    if (!newEmail || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ code: 'WRONG_CODE', message: 'ඉලක්කම් 6ක කේතය ඇතුළත් කරන්න.' });
    }

    // The code only works for the address it was sent to
    const pending = pendingEmails.get(userId);
    if (!pending || pending.toLowerCase() !== newEmail.toLowerCase()) {
      return res.status(400).json({ code: 'NO_CODE', message: 'කරුණාකර නව කේතයක් ඉල්ලන්න.' });
    }

    const result = otpStore.verify(emailChangeKey(userId), code);
    if (result !== 'OK') {
      if (result !== 'WRONG_CODE') pendingEmails.delete(userId);
      const messages = {
        NO_CODE: 'කරුණාකර නව කේතයක් ඉල්ලන්න.',
        CODE_EXPIRED: 'කේතය කල් ඉකුත් වී ඇත. නව කේතයක් ඉල්ලන්න.',
        WRONG_CODE: 'කේතය වැරදියි. නැවත උත්සාහ කරන්න.',
        TOO_MANY_ATTEMPTS: 'වැරදි උත්සාහයන් වැඩියි. නව කේතයක් ඉල්ලන්න.'
      };
      return res.status(400).json({ code: result, message: messages[result] });
    }
    pendingEmails.delete(userId);

    // Someone may have registered with this address while the code was on its way
    const taken = await prisma.user.findFirst({
      where: { email: { equals: pending, mode: 'insensitive' }, NOT: { id: userId } }
    });
    if (taken) {
      return res.status(400).json({ code: 'EMAIL_TAKEN', message: 'මෙම email ලිපිනය වෙනත් ගිණුමක් භාවිත කරයි.' });
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: { email: pending }, include: ALL_PROFILES });
    // A login code still waiting was sent to the old address; the next one goes to the new address
    otpStore.forget(userId);
    res.json({ message: 'Email ලිපිනය වෙනස් කරන ලදී.', user: toPublicUser(updated) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ code: 'EMAIL_TAKEN', message: 'මෙම email ලිපිනය වෙනත් ගිණුමක් භාවිත කරයි.' });
    }
    if (error.code === 'P2025') {
      return res.status(401).json({ message: 'ගිණුම සොයාගත නොහැක. නැවත Log වන්න.' });
    }
    console.error('EMAIL_CHANGE_VERIFY_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};
