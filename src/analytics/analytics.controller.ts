import {
  Controller,
  Post,
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
    await this.analyticsService.createOrUpdateSnapshot(
      pharmacyId,
      createAnalyticsDto,
    );

    return {
      message: 'Analytics snapshot received and stored successfully',
      pharmacyId,
    };
  }
}

