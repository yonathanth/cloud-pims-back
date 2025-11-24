import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class PharmacyService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private configService: ConfigService,
  ) {}

  async getFirstPharmacy() {
    const configuredPharmacyId =
      this.configService.get<string>('PHARMACY_ID');
    if (configuredPharmacyId) {
      const pharmacy = await this.prisma.pharmacy.findUnique({
        where: { pharmacyId: configuredPharmacyId },
      });
      if (!pharmacy) {
        throw new NotFoundException(
          `Configured pharmacy "${configuredPharmacyId}" not found in cloud database`,
        );
      }
      return pharmacy;
    }
    return this.prisma.pharmacy.findFirst();
  }

  async getLatestAnalytics(pharmacyId: string) {
    return this.analyticsService.getLatestSnapshot(pharmacyId);
  }

  async getLastUpdated(pharmacyId: string) {
    return this.analyticsService.getLastUpdated(pharmacyId);
  }
}

