import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validApiKey = process.env.INTERNAL_API_KEY;

    if (!validApiKey) {
      throw new UnauthorizedException(
        '서버에 INTERNAL_API_KEY가 설정되어 있지 않습니다.',
      );
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('유효하지 않은 API 키입니다.');
    }

    return true;
  }
}
