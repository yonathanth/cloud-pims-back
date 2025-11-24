import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const pharmacyId = request.params.pharmacyId;

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    if (!pharmacyId) {
      throw new UnauthorizedException('Pharmacy ID is missing');
    }

    // Find pharmacy by pharmacyId
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { pharmacyId },
    });

    if (!pharmacy) {
      throw new UnauthorizedException('Invalid pharmacy ID');
    }

    // Compare API key with hashed version
    const isValid = await bcrypt.compare(apiKey, pharmacy.apiKeyHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach pharmacy to request for use in controller
    request.pharmacy = pharmacy;

    return true;
  }
}

