import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('sales')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
@Controller('api/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get(':pharmacyId/:period')
  @ApiOperation({
    summary: 'Get sales snapshot for a specific period',
    description: 'Returns sales data (top 10 products) for the specified period (daily, weekly, monthly, yearly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales snapshot retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Sales snapshot not found for the specified period',
  })
  async getSalesByPeriod(
    @Param('pharmacyId') pharmacyId: string,
    @Param('period') period: string,
  ) {
    return this.salesService.getSnapshotByPeriod(pharmacyId, period);
  }
}


