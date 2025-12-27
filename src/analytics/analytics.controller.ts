import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('analytics')
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post(':pharmacyId')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive analytics snapshot from LAN system',
    description: 'Protected by API key authentication via x-api-key header',
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'API key for authentication',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics snapshot received and stored successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async receiveAnalytics(
    @Param('pharmacyId') pharmacyId: string,
    @Body() createAnalyticsDto: CreateAnalyticsDto,
  ): Promise<{ message: string; pharmacyId: string }> {
    console.log(`📥 Received analytics data from old uploader for ${pharmacyId}`);
    await this.analyticsService.createOrUpdateSnapshot(
      pharmacyId,
      createAnalyticsDto,
    );
    console.log(`✅ Successfully processed old format analytics for ${pharmacyId}`);

    return {
      message: 'Analytics snapshot received and stored successfully',
      pharmacyId,
    };
  }

  @Get(':pharmacyId/:period')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get analytics snapshot for a specific period',
    description: 'Returns analytics data for the specified period (daily, weekly, monthly, yearly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics snapshot retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Analytics snapshot not found for the specified period',
  })
  async getAnalyticsByPeriod(
    @Param('pharmacyId') pharmacyId: string,
    @Param('period') period: string,
  ) {
    return this.analyticsService.getSnapshotByPeriod(pharmacyId, period);
  }
}

