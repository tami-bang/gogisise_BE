import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express'; // isolatedModules 대응: type-only import
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

// [보안] 이 컨트롤러의 모든 엔드포인트는 유효한 JWT 없이는 접근 불가
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private buildMeta(prefix: string) {
    return {
      requestId: `req_${prefix}_${Date.now()}`,
      servedAt: new Date().toISOString(),
    };
  }

  @Get('me')
  async getMyProfile(@Req() req: Request) {
    const userId = (req as any).user.userId;
    const data = await this.usersService.getMyProfile(userId);
    return { success: true, data, meta: this.buildMeta('me') };
  }

  @Get('me/favorites')
  async getFavorites(@Req() req: Request) {
    const userId = (req as any).user.userId;
    const items = await this.usersService.getFavorites(userId);
    return {
      success: true,
      data: { items },
      meta: this.buildMeta('favorites'),
    };
  }

  @Post('me/favorites/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content
  async addFavorite(
    @Req() req: Request,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    const userId = (req as any).user.userId;
    await this.usersService.addFavorite(userId, itemId);
  }

  @Delete('me/favorites/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content
  async removeFavorite(
    @Req() req: Request,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    const userId = (req as any).user.userId;
    await this.usersService.removeFavorite(userId, itemId);
  }
}
