import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Disable authentication for testing
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (process.env.DISABLE_AUTH === 'true') {
      console.log('⚠️  AUTHENTICATION DISABLED FOR TESTING');
      return true;
    }
    return super.canActivate(context);
  }
}

