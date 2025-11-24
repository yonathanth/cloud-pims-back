import { IsObject, IsString, IsNotEmpty, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnalyticsDto {
  @ApiProperty({ description: 'Analytics payload from LAN system' })
  @IsObject()
  @IsNotEmpty()
  analytics: any;

  @ApiProperty({ description: 'SHA256 hash of analytics payload' })
  @IsString()
  @IsNotEmpty()
  hash: string;

  @ApiProperty({ description: 'ISO timestamp when uploaded from LAN system' })
  @IsISO8601()
  @IsNotEmpty()
  uploadedAt: string;
}

