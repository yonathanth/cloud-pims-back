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
    const period = 'daily'; // Default period for legacy endpoint

    // Upsert analytics snapshot (update if exists, create if not)
    await this.prisma.analyticsSnapshot.upsert({
      where: {
        pharmacyId_period: {
          pharmacyId,
          period,
        },
      },
      update: {
        snapshot: data.analytics as any,
        hash: data.hash,
        uploadedAt,
        storedAt: new Date(),
      },
      create: {
        pharmacyId,
        period,
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
    // Get the latest snapshot by finding the most recent one for the pharmacy
    const snapshot = await this.prisma.analyticsSnapshot.findFirst({
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
      orderBy: {
        uploadedAt: 'desc',
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

  async getSnapshotByPeriod(
    pharmacyId: string,
    period: string,
  ): Promise<any> {
    const snapshot = await this.prisma.analyticsSnapshot.findUnique({
      where: {
        pharmacyId_period: {
          pharmacyId,
          period,
        },
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
        `No analytics snapshot found for pharmacy ${pharmacyId} and period ${period}`,
      );
    }

    return {
      pharmacyId: snapshot.pharmacyId,
      pharmacyName: snapshot.pharmacy.name,
      lastUpdatedAt: snapshot.pharmacy.lastUpdatedAt,
      analytics: snapshot.snapshot,
      uploadedAt: snapshot.uploadedAt,
      storedAt: snapshot.storedAt,
      period: snapshot.period,
    };
  }

  async createOrUpdateSnapshotByPeriod(
    pharmacyId: string,
    period: string,
    analytics: any,
    hash: string,
    uploadedAt: string,
  ): Promise<void> {
    const uploadedAtDate = new Date(uploadedAt);

    // Upsert analytics snapshot by period (update if exists, create if not)
    await this.prisma.analyticsSnapshot.upsert({
      where: {
        pharmacyId_period: {
          pharmacyId,
          period,
        },
      },
      update: {
        snapshot: analytics as any,
        hash,
        uploadedAt: uploadedAtDate,
        storedAt: new Date(),
      },
      create: {
        pharmacyId,
        period,
        snapshot: analytics as any,
        hash,
        uploadedAt: uploadedAtDate,
        storedAt: new Date(),
      },
    });

    // Update pharmacy lastUpdatedAt
    await this.prisma.pharmacy.update({
      where: { pharmacyId },
      data: {
        lastUpdatedAt: uploadedAtDate,
      },
    });
  }
}

