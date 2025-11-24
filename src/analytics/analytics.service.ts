import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateSnapshot(
    pharmacyId: string,
    data: CreateAnalyticsDto,
  ): Promise<void> {
    const uploadedAt = new Date(data.uploadedAt);

    // Upsert analytics snapshot (update if exists, create if not)
    await this.prisma.analyticsSnapshot.upsert({
      where: { pharmacyId },
      update: {
        snapshot: data.analytics as any,
        hash: data.hash,
        uploadedAt,
        storedAt: new Date(),
      },
      create: {
        pharmacyId,
        snapshot: data.analytics as any,
        hash: data.hash,
        uploadedAt,
        storedAt: new Date(),
      },
    });

    // Update pharmacy lastUpdatedAt
    await this.prisma.pharmacy.update({
      where: { pharmacyId },
      data: {
        lastUpdatedAt: uploadedAt,
      },
    });
  }

  async getLatestSnapshot(pharmacyId: string): Promise<any> {
    const snapshot = await this.prisma.analyticsSnapshot.findUnique({
      where: { pharmacyId },
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
        `No analytics snapshot found for pharmacy ${pharmacyId}`,
      );
    }

    return {
      pharmacyId: snapshot.pharmacyId,
      pharmacyName: snapshot.pharmacy.name,
      lastUpdatedAt: snapshot.pharmacy.lastUpdatedAt,
      analytics: snapshot.snapshot,
      uploadedAt: snapshot.uploadedAt,
      storedAt: snapshot.storedAt,
    };
  }

  async getLastUpdated(pharmacyId: string): Promise<{
    pharmacyId: string;
    lastUpdatedAt: Date | null;
  }> {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { pharmacyId },
      select: {
        pharmacyId: true,
        lastUpdatedAt: true,
      },
    });

    if (!pharmacy) {
      throw new NotFoundException(`Pharmacy ${pharmacyId} not found`);
    }

    return {
      pharmacyId: pharmacy.pharmacyId,
      lastUpdatedAt: pharmacy.lastUpdatedAt,
    };
  }
}

