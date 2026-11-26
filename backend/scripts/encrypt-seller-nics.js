// One-time clean-up: encrypts every seller NIC that is still stored as plain text, and removes
// plain-text NIC numbers and NIC photos that already have an encrypted copy.
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
  // Sellers who signed up before the fix kept a plain-text NIC next to the encrypted copy. Replace it with a placeholder.
  const withPlainCopy = await prisma.sellerProfile.findMany({ where: { nicEncrypted: { not: null } }, select: { id: true, nicNumber: true } });
  let scrubbed = 0;
  for (const seller of withPlainCopy) {
    if (!nicVault.isValidNic(seller.nicNumber)) continue;
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { nicNumber: `SELF-SELLER-${crypto.randomBytes(8).toString('hex').toUpperCase()}` }
    });
    scrubbed += 1;
  }

  // Plain NIC photos are removed only when an encrypted copy of both sides exists, so no seller loses her documents.
  const photos = await prisma.sellerProfile.updateMany({
    where: {
      OR: [{ nicFront: { not: null } }, { nicBack: { not: null } }],
      identityDocuments: { is: { frontImage: { not: null }, backImage: { not: null } } }
    },
    data: { nicFront: null, nicBack: null }
  });

  console.log(`Encrypted ${done} seller NIC(s). ${skipped} had no real NIC.`);
  console.log(`Removed ${scrubbed} plain-text NIC copy(ies) and plain NIC photos from ${photos.count} seller(s).`);
  await prisma.$disconnect();
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
