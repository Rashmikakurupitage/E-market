const crypto = require('crypto');
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const otpStore = require('../utils/otpStore');
const { sendLoginCode, explainMailError } = require('../utils/mailer');

// Admin accounts must never be created through public sign-up
const SELF_SERVICE_ROLES = ['CUSTOMER', 'SELLER'];

// Old NIC: 9 digits + V/X (e.g. 858470123V). New NIC: 12 digits (e.g. 198584700123)
const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;

const signToken = (user, expiresIn = '7d') =>
  jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn }
  );

// Never send passwordHash back to the browser
const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profile: user.sellerProfile || user.customerProfile || user.adminProfile
});

// 1. User Registration
exports.register = async (req, res) => {
  try {
    const { email, phone, password, fullName, businessName, district, whatsappNo, description } = req.body;
    const role = req.body.role || 'CUSTOMER';
    const nicNumber = req.body.nicNumber?.trim().toUpperCase();

    if (!email || !phone) {
      return res.status(400).json({ message: 'Email සහ Phone අංකය අවශ්‍ය වේ.' });
    }

    if (!SELF_SERVICE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'අවලංගු ගිණුම් වර්ගයකි.' });
    }

    // Sellers and customers log in with email + NIC + a code sent to their email, so no password is needed
    if (password && password.length < 8) {
      return res.status(400).json({ message: 'Password එක අවම වශයෙන් අක්ෂර 8ක් විය යුතුය.' });
    }

    if (!nicNumber) {
      return res.status(400).json({ message: 'NIC අංකය අනිවාර්ය වේ.' });
    }

    if (!NIC_PATTERN.test(nicNumber)) {
      return res.status(400).json({ message: 'NIC අංකය වලංගු නොවේ.' });
    }

    // Email, Phone හෝ NIC එක කලින් ලියාපදිංචි වී ඇත්දැයි බැලීම
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email හෝ Phone අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }

    // One seller account and one customer account per NIC
    const profiles = role === 'SELLER' ? prisma.sellerProfile : prisma.customerProfile;
    const existingNic = await profiles.findUnique({
      where: { nicNumber }
    });
    if (existingNic) {
      return res.status(400).json({ message: 'මෙම NIC අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }

    // Without a password, store a random one nobody knows (the column can't be empty)
    const passwordHash = await bcrypt.hash(password || crypto.randomBytes(32).toString('hex'), 10);

    // User සහ Profile එක එකවර සාදාගැනීම (එකක් අසාර්ථක වුවහොත් කිසිවක් save නොවේ)
    const profile =
      role === 'SELLER'
        ? {
            sellerProfile: {
              create: {
                businessName: businessName || 'My Business',
                district: district || 'Colombo',
                nicNumber,
                whatsappNo: whatsappNo || phone,
                description: description || null
              }
            }
          }
        : {
            customerProfile: {
              create: { fullName: fullName || 'Customer', nicNumber }
            }
          };

    const user = await prisma.user.create({
      data: { email, phone, passwordHash, role, ...profile },
      include: { sellerProfile: true, customerProfile: true }
    });

    // Register වූ විගසම log in කර තැබීම සඳහා token එකක් ලබාදීම
    res.status(201).json({
      message: 'User සාර්ථකව ලියාපදිංචි විය!',
      token: signToken(user),
      user: toPublicUser(user)
    });
  } catch (error) {
    // Two sign-ups with the same email/phone/NIC at the same moment
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
      return res.status(400).json({ message: 'Email හෝ Password වැරදියි.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email හෝ Password වැරදියි.' });
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

// --- Admin registration (only with the admin registration code from backend/.env) ---

const SIGNUP_MAX_FAILURES = 5;
const SIGNUP_LOCK_MS = 15 * 60 * 1000;
const signupFailures = new Map(); // ip -> { count, firstAt }
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

// Compares without leaking how many characters matched
const sameSecret = (given, expected) => {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

// "lwem 7k4p-9xq2" and "LWEM-7K4P-9XQ2" count as the same code
const normalizeCode = (value) => String(value || '').toUpperCase().replace(/[\s-]/g, '');

exports.registerAdmin = async (req, res) => {
  try {
    const expectedCode = normalizeCode(process.env.ADMIN_SIGNUP_CODE);
    if (!expectedCode) {
      return res.status(403).json({ code: 'ADMIN_SIGNUP_DISABLED', message: 'පරිපාලක ලියාපදිංචිය අක්‍රීයයි.' });
    }

    // Too many wrong codes from this computer: wait 15 minutes
    const failures = signupFailures.get(req.ip);
    if (failures && Date.now() - failures.firstAt > SIGNUP_LOCK_MS) signupFailures.delete(req.ip);
    if ((signupFailures.get(req.ip)?.count || 0) >= SIGNUP_MAX_FAILURES) {
      return res.status(429).json({ code: 'TOO_MANY_ATTEMPTS', message: 'වැරදි උත්සාහයන් වැඩියි. මිනිත්තු 15කින් නැවත උත්සාහ කරන්න.' });
    }

    if (!sameSecret(normalizeCode(req.body.signupCode), expectedCode)) {
      const current = signupFailures.get(req.ip) || { count: 0, firstAt: Date.now() };
      signupFailures.set(req.ip, { ...current, count: current.count + 1 });
      return res.status(403).json({ code: 'WRONG_SIGNUP_CODE', message: 'පරිපාලක ලියාපදිංචි කේතය වැරදියි.' });
    }
    signupFailures.delete(req.ip);

    const fullName = req.body.fullName?.trim();
    const email = req.body.email?.trim();
    const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
    const nicNumber = req.body.nicNumber?.trim().toUpperCase();

    if (!fullName || !email || !phone || !nicNumber) {
      return res.status(400).json({ code: 'MISSING_DETAILS', message: 'සියලු තොරතුරු ඇතුළත් කරන්න.' });
    }
    if (!NIC_PATTERN.test(nicNumber)) {
      return res.status(400).json({ code: 'INVALID_NIC', message: 'NIC අංකය වලංගු නොවේ.' });
    }
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ code: 'INVALID_PHONE', message: 'දුරකථන අංකය වලංගු නොවේ.' });
    }

    const taken = await prisma.user.findFirst({
      where: { OR: [{ email: { equals: email, mode: 'insensitive' } }, { phone }] }
    });
    if (taken) {
      return res.status(400).json({ code: 'EMAIL_OR_PHONE_TAKEN', message: 'Email හෝ Phone අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }
    if (await prisma.adminProfile.findUnique({ where: { nicNumber } })) {
      return res.status(400).json({ code: 'NIC_TAKEN', message: 'මෙම NIC අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
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

    // No automatic login: the new admin proves the email is theirs by logging in with the emailed code
    res.status(201).json({ message: 'පරිපාලක ගිණුම සාදන ලදී. දැන් Log වන්න.' });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ code: 'EMAIL_OR_PHONE_TAKEN', message: 'Email, Phone හෝ NIC අංකය දැනටමත් ලියාපදිංචි වී ඇත.' });
    }
    console.error('ADMIN_REGISTER_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

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
      // false only while developing without SMTP settings: the code is in the backend terminal
      emailed: delivery.emailed,
      sentTo: maskEmail(user.email),
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
      include: { sellerProfile: true, customerProfile: true, adminProfile: true }
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
      data.sellerProfile = { update: { whatsappNo } };
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
      sentTo: maskEmail(newEmail),
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
