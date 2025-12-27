import {
  Controller,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { ApiKeyGuard } from '../api-key/api-key.guard';

@ApiTags('sync')
@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('period/:pharmacyId/:period')
  @UseGuards(ApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive period-based sync data from LAN system',
    description: 'Protected by API key authentication via x-api-key header. Receives compressed analytics and sales data for a specific period.',
  })
  @ApiHeader({
    name: 'x-api-key',
    description: 'API key for authentication',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Period data received and stored successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async receivePeriodData(
    @Param('pharmacyId') pharmacyId: string,
    @Param('period') period: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('content-encoding') encoding?: string,
  ): Promise<{ message: string; pharmacyId: string; period: string }> {
    console.log(`📥 Received sync request for ${pharmacyId}/${period}`);
    console.log(`📦 Raw body type: ${typeof req.rawBody}, isBuffer: ${Buffer.isBuffer(req.rawBody)}`);
    console.log(`📦 Body type: ${typeof req.body}, isBuffer: ${Buffer.isBuffer(req.body)}`);
    console.log(`📦 Content-Type: ${req.headers['content-type']}`);
    console.log(`📦 Content-Encoding: ${encoding}`);
    
    // Get raw body - ensure it's a Buffer
    // Try rawBody first, then body (which should be a Buffer for this route)
    let body: Buffer;
    if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
      body = req.rawBody;
      console.log(`📦 Using req.rawBody as buffer, length: ${body.length}`);
    } else if (Buffer.isBuffer(req.body)) {
      body = req.body;
      console.log(`📦 Using req.body as buffer, length: ${body.length}`);
    } else if (req.rawBody) {
      // Try to convert rawBody to Buffer
      if (typeof req.rawBody === 'string') {
        // Try base64 first, then binary
        try {
          body = Buffer.from(req.rawBody, 'base64');
          console.log(`📦 Interpreted rawBody as base64, length: ${body.length}`);
        } catch {
          body = Buffer.from(req.rawBody, 'binary');
          console.log(`📦 Interpreted rawBody as binary string, length: ${body.length}`);
        }
      } else {
        body = Buffer.from(String(req.rawBody));
        console.log(`📦 Converted rawBody to buffer, length: ${body.length}`);
      }
    } else {
      // Last resort: this shouldn't happen with gzip
      console.error(`❌ No raw body available!`);
      console.error(`   rawBody type: ${typeof req.rawBody}, isBuffer: ${Buffer.isBuffer(req.rawBody)}`);
      console.error(`   body type: ${typeof req.body}, isBuffer: ${Buffer.isBuffer(req.body)}`);
      throw new Error('No raw body available for gzip decompression');
    }
    
    console.log(`📦 Final body length: ${body.length} bytes`);
    console.log(`📦 First 20 bytes (hex): ${body.slice(0, Math.min(20, body.length)).toString('hex')}`);
    
    try {
      await this.syncService.receivePeriodData(pharmacyId, period, body, encoding);
      console.log(`✅ Successfully processed sync for ${pharmacyId}/${period}`);
      return {
        message: 'Period data received and stored successfully',
        pharmacyId,
        period,
      };
    } catch (error: any) {
      console.error(`❌ Error processing sync for ${pharmacyId}/${period}:`, error);
      throw error;
    }
  }
}

