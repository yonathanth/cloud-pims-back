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
    const method = request.method;
    const url = request.url;

    console.log(`🔐 API Key Guard - ${method} ${url}`);
    console.log(`   Pharmacy ID: ${pharmacyId}`);
    console.log(`   API Key present: ${!!apiKey}`);
    console.log(`   API Key value: ${apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING'}`);

    if (!apiKey) {
      console.log('❌ API key is missing');
      throw new UnauthorizedException('API key is missing');
    }

    if (!pharmacyId) {
      console.log('❌ Pharmacy ID is missing');
      throw new UnauthorizedException('Pharmacy ID is missing');
    }

    // Find pharmacy by pharmacyId
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { pharmacyId },
    });

    if (!pharmacy) {
      console.log(`❌ Pharmacy not found: ${pharmacyId}`);
      throw new UnauthorizedException('Invalid pharmacy ID');
    }

    console.log(`✅ Pharmacy found: ${pharmacy.name || pharmacyId}`);

    // Compare API key with hashed version
    const isValid = await bcrypt.compare(apiKey, pharmacy.apiKeyHash);

    if (!isValid) {
      console.log('❌ API key validation failed');
      throw new UnauthorizedException('Invalid API key');
    }

    console.log('✅ API key validated successfully');

    // Attach pharmacy to request for use in controller
    request.pharmacy = pharmacy;

    return true;
  }
}

