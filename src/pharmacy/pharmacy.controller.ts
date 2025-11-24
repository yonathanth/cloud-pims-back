import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('pharmacy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('api/pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('analytics/latest')
  @ApiOperation({
    summary: 'Get latest analytics snapshot',
    description: 'Returns the most recent analytics data for the pharmacy',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest analytics snapshot retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'No analytics snapshot found' })
  async getLatestAnalytics() {
    // For single owner, get the first pharmacy
    const pharmacy = await this.pharmacyService.getFirstPharmacy();
    if (!pharmacy) {
      throw new NotFoundException('No pharmacy found');
    }
    return this.pharmacyService.getLatestAnalytics(pharmacy.pharmacyId);
  }

  @Get('analytics/last-updated')
  @ApiOperation({
    summary: 'Get last updated timestamp',
    description: 'Returns when the analytics database was last updated',
  })
  @ApiResponse({
    status: 200,
    description: 'Last updated timestamp retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Pharmacy not found' })
  async getLastUpdated() {
    // For single owner, get the first pharmacy
    const pharmacy = await this.pharmacyService.getFirstPharmacy();
    if (!pharmacy) {
      throw new NotFoundException('No pharmacy found');
    }
    return this.pharmacyService.getLastUpdated(pharmacy.pharmacyId);
  }
}

