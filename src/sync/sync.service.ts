import { Injectable, Logger } from '@nestjs/common';
import { gunzip } from 'zlib';
import { promisify } from 'util';
import { AnalyticsService } from '../analytics/analytics.service';
import { SalesService } from '../sales/sales.service';

const gunzipAsync = promisify(gunzip);

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly salesService: SalesService,
  ) {}

  async receivePeriodData(
    pharmacyId: string,
    period: string,
    body: any,
    encoding?: string,
  ): Promise<void> {
    // Decompress if needed
    let data: any;
    
    // Ensure body is a Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'string') {
      // If it's a string, try to convert to buffer
      // Check if it looks like hex or base64
      buffer = Buffer.from(body, 'utf8');
    } else {
      // Last resort: stringify and convert
      buffer = Buffer.from(JSON.stringify(body));
    }
    
    this.logger.debug(`Processing payload: ${buffer.length} bytes, encoding: ${encoding}`);
    this.logger.debug(`Buffer type: ${Buffer.isBuffer(buffer)}, first 10 bytes (hex): ${buffer.slice(0, Math.min(10, buffer.length)).toString('hex')}`);
    
    // Check for gzip magic bytes first (1f 8b) - this is the most reliable indicator
    const magicBytes = buffer.slice(0, 2);
    const isGzipped = magicBytes[0] === 0x1f && magicBytes[1] === 0x8b;
    
    // Decompress if gzipped - always check magic bytes first (most reliable)
    // Only use encoding header as fallback if magic bytes check fails
    if (isGzipped) {
      try {
        this.logger.debug(`✅ Detected gzip magic bytes (1f 8b), decompressing ${buffer.length} bytes...`);
        const decompressed = await gunzipAsync(buffer);
        const jsonString = decompressed.toString('utf8');
        this.logger.debug(`✅ Decompressed ${buffer.length} bytes → ${decompressed.length} bytes (${jsonString.length} chars JSON)`);
        data = JSON.parse(jsonString);
        this.logger.debug(`✅ Successfully parsed JSON for ${pharmacyId}/${period}`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to decompress payload: ${error.message}`);
        this.logger.error(`   Buffer length: ${buffer.length} bytes`);
        this.logger.error(`   First 20 bytes (hex): ${buffer.slice(0, Math.min(20, buffer.length)).toString('hex')}`);
        this.logger.error(`   Last 20 bytes (hex): ${buffer.slice(Math.max(0, buffer.length - 20)).toString('hex')}`);
        this.logger.error(`   Magic bytes: ${magicBytes.toString('hex')} (expected: 1f8b)`);
        throw new Error(`Failed to decompress payload: ${error.message}`);
      }
    } else if (encoding === 'gzip') {
      // Fallback: if encoding header says gzip but magic bytes don't match, log warning
      this.logger.warn(`⚠️ Content-Encoding header says 'gzip' but magic bytes don't match (${magicBytes.toString('hex')}). Treating as non-gzipped JSON.`);
      try {
        data = JSON.parse(buffer.toString('utf8'));
        this.logger.debug(`✅ Parsed as non-gzipped JSON for ${pharmacyId}/${period}`);
      } catch (error: any) {
        this.logger.error(`Failed to parse payload: ${error.message}`);
        throw new Error(`Failed to parse payload: ${error.message}`);
      }
    } else {
      // Not gzipped, parse as JSON
      try {
        data = JSON.parse(buffer.toString('utf8'));
        this.logger.debug(`✅ Parsed non-gzipped payload for ${pharmacyId}/${period}`);
      } catch (error: any) {
        this.logger.error(`Failed to parse payload: ${error.message}`);
        throw new Error(`Failed to parse payload: ${error.message}`);
      }
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
      throw new Error(`Invalid period: ${period}. Must be one of: ${validPeriods.join(', ')}`);
    }

    // Extract hash and uploadedAt from payload
    // The hash is computed on the LAN side for the entire payload, so we use the same hash for both
    const hash = data.hash || this.computeHash(JSON.stringify(data));
    const uploadedAt = data.uploadedAt || new Date().toISOString();

    // Store analytics snapshot
    if (data.analytics) {
      this.logger.log(`Storing analytics snapshot for ${pharmacyId}/${period}...`);
      try {
        await this.analyticsService.createOrUpdateSnapshotByPeriod(
          pharmacyId,
          period,
          data.analytics,
          hash,
          uploadedAt,
        );
        this.logger.log(`✅ Successfully stored analytics snapshot for ${pharmacyId}/${period}`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to store analytics snapshot for ${pharmacyId}/${period}:`, error);
        this.logger.error(`   Error stack: ${error.stack}`);
        throw error;
      }
    } else {
      this.logger.warn(`No analytics data in payload for ${pharmacyId}/${period}`);
    }

    // Store sales snapshot
    if (data.sales) {
      this.logger.log(`Storing sales snapshot for ${pharmacyId}/${period}...`);
      try {
        await this.salesService.createOrUpdateSnapshotByPeriod(
          pharmacyId,
          period,
          data.sales,
          hash,
          uploadedAt,
        );
        this.logger.log(`✅ Successfully stored sales snapshot for ${pharmacyId}/${period}`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to store sales snapshot for ${pharmacyId}/${period}:`, error);
        this.logger.error(`   Error stack: ${error.stack}`);
        throw error;
      }
    } else {
      this.logger.warn(`No sales data in payload for ${pharmacyId}/${period}`);
    }
  }

  private computeHash(data: any): string {
    // Fallback hash computation if not provided
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}

