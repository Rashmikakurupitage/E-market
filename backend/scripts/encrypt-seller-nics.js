// One-time clean-up: encrypts every seller NIC that is still stored as plain text.
//   node scripts/encrypt-seller-nics.js
// It needs NIC_ENCRYPTION_KEY in backend/.env. Safe to run again: sellers that are already protected are skipped.
require('dotenv').config();
const crypto = require('crypto');
const prisma = require('../src/config/db');
const nicVault = require('../src/utils/nicVault');

(async () => {
  const sellers = await prisma.sellerProfile.findMany({ where: { nicEncrypted: null }, select: { id: true, nicNumber: true } });
  let done = 0;
  let skipped = 0;
  for (const seller of sellers) {
    if (!nicVault.isValidNic(seller.nicNumber)) {
      skipped += 1; // a placeholder such as SELF-SELLER-..., there is no real NIC to protect
      continue;
    }
    const data = nicVault.protect(seller.nicNumber);
    const taken = await prisma.sellerProfile.findUnique({ where: { nicHash: data.nicHash }, select: { id: true } });
    if (taken) {
      console.warn(`Seller ${seller.id}: this NIC is already registered on another seller. Left unchanged.`);
      continue;
    }
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { ...data, nicNumber: `SELF-SELLER-${crypto.randomBytes(8).toString('hex').toUpperCase()}` }
    });
    done += 1;
  }
  console.log(`Encrypted ${done} seller NIC(s). ${skipped} had no real NIC.`);
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
