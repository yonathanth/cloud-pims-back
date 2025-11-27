import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'New username',
    example: 'newusername',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiPropertyOptional({
    description: 'Full name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Current password (required if changing password)',
    example: 'oldpassword123',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({
    description: 'New password',
    example: 'newpassword123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class UpdateAccountResponseDto {
  @ApiProperty({
    description: 'Updated user information',
  })
  user: {
    id: number;
    username: string;
    fullName?: string;
  };
}





