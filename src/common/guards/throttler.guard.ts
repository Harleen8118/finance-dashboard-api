import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'VIEWER') {
      return 30;
    }

    return 100;
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    return 60000; // 60 seconds in milliseconds
  }
}
