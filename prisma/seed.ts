import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding cloud API database...');

  const forceRecreatePharmacy =
    process.env.FORCE_RECREATE_PHARMACY === 'true';

  // Create owner account
  const ownerUsername = process.env.OWNER_USERNAME || 'derebe';
  const ownerPassword = process.env.OWNER_PASSWORD || 'admin123';
  const ownerFullName = process.env.OWNER_FULL_NAME || 'Pharmacy Owner';

  const existingOwner = await prisma.owner.findUnique({
    where: { username: ownerUsername },
  });

  if (existingOwner) {
    console.log(`Owner account "${ownerUsername}" already exists. Skipping...`);
  } else {
    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const owner = await prisma.owner.create({
      data: {
        username: ownerUsername,
        passwordHash,
        fullName: ownerFullName,
      },
    });
    console.log(`✅ Created owner account: ${owner.username}`);
  }

  // Create pharmacy
  const pharmacyId = process.env.PHARMACY_ID || 'pharmacy_1';
  const pharmacyName = process.env.PHARMACY_NAME || 'Main Pharmacy';
  const pharmacyApiKey =
    process.env.PHARMACY_API_KEY || 'default-api-key-change-me';

  const existingPharmacy = await prisma.pharmacy.findUnique({
    where: { pharmacyId },
  });

  let pharmacy = existingPharmacy;
  const apiKeyHash = await bcrypt.hash(pharmacyApiKey, 10);

  if (existingPharmacy) {
    const needsRecreate =
      forceRecreatePharmacy || existingPharmacy.pharmacyId !== pharmacyId;

    if (needsRecreate) {
      console.log(
        `Recreating pharmacy "${existingPharmacy.pharmacyId}" as "${pharmacyId}"...`,
      );
      await prisma.pharmacy.delete({
        where: { id: existingPharmacy.id },
      });
      pharmacy = null;
    } else {
      console.log(
        `Updating pharmacy "${existingPharmacy.pharmacyId}" credentials...`,
      );
      pharmacy = await prisma.pharmacy.update({
        where: { id: existingPharmacy.id },
        data: {
          name: pharmacyName,
          apiKeyHash,
        },
      });
      console.log(`🔐 Updated API key for pharmacy: ${pharmacy.pharmacyId}`);
      console.log(`⚠️  IMPORTANT: Save this API key - it won't be shown again:`);
      console.log(`   API Key: ${pharmacyApiKey}`);
    }
  } else {
    pharmacy = null;
  }

  if (!pharmacy) {
    pharmacy = await prisma.pharmacy.create({
      data: {
        pharmacyId,
        name: pharmacyName,
        apiKeyHash,
      },
    });
    console.log(`✅ Created pharmacy: ${pharmacy.pharmacyId}`);
    console.log(
      `⚠️  IMPORTANT: Save this API key - it won't be shown again:`,
    );
    console.log(`   API Key: ${pharmacyApiKey}`);
  }

  // Create sample analytics snapshot
  const existingSnapshot = await prisma.analyticsSnapshot.findUnique({
    where: { pharmacyId: pharmacy.pharmacyId },
  });

  if (existingSnapshot) {
    console.log(`Analytics snapshot for "${pharmacyId}" already exists. Skipping...`);
  } else {
    const sampleAnalytics = {
      sales: {
        total: 125000,
        today: 3500,
        thisWeek: 24500,
        thisMonth: 98000,
      },
      inventory: {
        totalItems: 1250,
        lowStock: 45,
        outOfStock: 3,
      },
      customers: {
        total: 1250,
        newThisMonth: 45,
      },
      topProducts: [
        { name: 'Product A', sales: 15000 },
        { name: 'Product B', sales: 12000 },
        { name: 'Product C', sales: 9800 },
      ],
    };

    const analyticsString = JSON.stringify(sampleAnalytics);
    const hash = crypto.createHash('sha256').update(analyticsString).digest('hex');
    const uploadedAt = new Date();

    await prisma.analyticsSnapshot.create({
      data: {
        pharmacyId: pharmacy.pharmacyId,
        snapshot: sampleAnalytics as any,
        hash,
        uploadedAt,
        storedAt: new Date(),
      },
    });

    // Update pharmacy lastUpdatedAt
    await prisma.pharmacy.update({
      where: { pharmacyId: pharmacy.pharmacyId },
      data: { lastUpdatedAt: uploadedAt },
    });

    console.log(`✅ Created sample analytics snapshot for pharmacy: ${pharmacy.pharmacyId}`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

