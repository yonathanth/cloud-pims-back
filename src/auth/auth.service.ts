import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { UpdateAccountDto, UpdateAccountResponseDto } from './dto/update-account.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log('🔐 Login attempt for user:', loginDto.username);
    
    // Disable password check for testing
    if (process.env.DISABLE_AUTH === 'true') {
      console.log('⚠️  AUTHENTICATION DISABLED - Accepting any credentials');
      // Try to find user, or create a dummy user response
      let owner = await this.prisma.owner.findFirst({});
      if (!owner) {
        // If no users exist, create a test user
        owner = await this.prisma.owner.create({
          data: {
            username: loginDto.username || 'test',
            passwordHash: await bcrypt.hash('test', 10),
            fullName: 'Test User',
          },
        });
      }
      const payload = {
        sub: owner.id,
        username: owner.username,
      };
      const token = this.jwtService.sign(payload);
      return {
        access_token: token,
        user: {
          id: owner.id,
          username: owner.username,
          fullName: owner.fullName || undefined,
        },
      };
    }
    
    const owner = await this.prisma.owner.findUnique({
      where: { username: loginDto.username },
    });

    if (!owner) {
      console.log('❌ User not found:', loginDto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      owner.passwordHash,
    );

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', loginDto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: owner.id,
      username: owner.username,
    };

    const token = this.jwtService.sign(payload);
    console.log('✅ Login successful for user:', owner.username);
    console.log('✅ Generated token:', token.substring(0, 20) + '...');

    return {
      access_token: token,
      user: {
        id: owner.id,
        username: owner.username,
        fullName: owner.fullName || undefined,
      },
    };
  }

  async updateAccount(
    userId: number,
    updateDto: UpdateAccountDto,
  ): Promise<UpdateAccountResponseDto> {
    console.log('updateAccount called with userId:', userId, 'data:', {
      username: updateDto.username,
      fullName: updateDto.fullName,
      hasCurrentPassword: !!updateDto.currentPassword,
      hasNewPassword: !!updateDto.newPassword,
    });

    const owner = await this.prisma.owner.findUnique({
      where: { id: userId },
    });

    if (!owner) {
      throw new UnauthorizedException('User not found');
    }

    console.log('Current owner:', { id: owner.id, username: owner.username });

    // If changing password, verify current password
    if (updateDto.newPassword) {
      if (!updateDto.currentPassword) {
        console.log('Error: New password provided but no current password');
        throw new BadRequestException('Current password is required to change password');
      }

      console.log('Verifying current password...');
      const isPasswordValid = await bcrypt.compare(
        updateDto.currentPassword,
        owner.passwordHash,
      );

      if (!isPasswordValid) {
        console.log('Error: Current password is incorrect');
        throw new UnauthorizedException('Current password is incorrect');
      }
      
      console.log('Current password verified successfully');
    }

    // Check if username is already taken by another user
    if (updateDto.username && updateDto.username !== owner.username) {
      console.log('Checking if username is available:', updateDto.username);
      const existingUser = await this.prisma.owner.findUnique({
        where: { username: updateDto.username },
      });

      if (existingUser && existingUser.id !== userId) {
        console.log('Error: Username already taken');
        throw new ConflictException('Username is already taken');
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (updateDto.username) {
      updateData.username = updateDto.username;
    }

    if (updateDto.fullName !== undefined) {
      updateData.fullName = updateDto.fullName || null;
    }

    if (updateDto.newPassword) {
      console.log('Hashing new password...');
      updateData.passwordHash = await bcrypt.hash(updateDto.newPassword, 10);
    }

    console.log('Updating owner with data:', updateData);

    // Update the owner
    const updatedOwner = await this.prisma.owner.update({
      where: { id: userId },
      data: updateData,
    });

    console.log('Owner updated successfully:', {
      id: updatedOwner.id,
      username: updatedOwner.username,
    });

    return {
      user: {
        id: updatedOwner.id,
        username: updatedOwner.username,
        fullName: updatedOwner.fullName || undefined,
      },
    };
  }
}

