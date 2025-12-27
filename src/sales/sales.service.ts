import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateSnapshotByPeriod(
    pharmacyId: string,
    period: string,
    snapshot: any,
    hash: string,
    uploadedAt: string,
  ): Promise<void> {
    const uploadedAtDate = new Date(uploadedAt);

    try {
      console.log(`💾 Upserting sales snapshot for ${pharmacyId}/${period}...`);
    await this.prisma.salesSnapshot.upsert({
      where: {
        pharmacyId_period: { pharmacyId, period },
      },
      update: {
        snapshot: snapshot as any,
        hash,
        uploadedAt: uploadedAtDate,
        storedAt: new Date(),
      },
      create: {
        pharmacyId,
        period,
        snapshot: snapshot as any,
        hash,
        uploadedAt: uploadedAtDate,
        storedAt: new Date(),
      },
    });
      console.log(`✅ Sales snapshot upserted successfully for ${pharmacyId}/${period}`);
    } catch (error: any) {
      console.error(`❌ Failed to upsert sales snapshot for ${pharmacyId}/${period}:`, error);
      console.error(`   Error code: ${error.code}`);
      console.error(`   Error message: ${error.message}`);
      if (error.meta) {
        console.error(`   Prisma meta:`, JSON.stringify(error.meta, null, 2));
      }
      throw new Error(`Failed to store sales snapshot: ${error.message}`);
    }
  }

  async getSnapshotByPeriod(pharmacyId: string, period: string): Promise<any> {
    const snapshot = await this.prisma.salesSnapshot.findUnique({
      where: {
        pharmacyId_period: { pharmacyId, period },
      },
      include: {
        pharmacy: {
          select: {
            pharmacyId: true,
            name: true,
            lastUpdatedAt: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new NotFoundException(
        `No sales snapshot found for pharmacy ${pharmacyId} and period ${period}`,
      );
    }

    return {
      pharmacyId: snapshot.pharmacyId,
      pharmacyName: snapshot.pharmacy.name,
      lastUpdatedAt: snapshot.pharmacy.lastUpdatedAt,
      sales: snapshot.snapshot,
      uploadedAt: snapshot.uploadedAt,
      storedAt: snapshot.storedAt,
      period: snapshot.period,
    };
  }
}

