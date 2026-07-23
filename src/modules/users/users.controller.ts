import {
  Controller,
  Get,
  Post,
  Delete,
  Patch, // 💡 [한글 주석] 프로필 정보/비밀번호 변경을 위한 Patch 데코레이터 추가
  Body,  // 💡 [한글 주석] 요청 바디 바인딩을 위한 Body 데코레이터 추가
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express'; // isolatedModules 대응: type-only import
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { UpdateProfileDto, UpdatePasswordDto } from './dto/users.dto'; // 💡 [한글 주석] 회원수정 및 비밀번호 변경 DTO 임포트

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

  /**
   * 💡 [한글 주석] 이메일 및 회원 정보 수정 API
   */
  @Patch('me/profile')
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = (req as any).user.userId;
    const data = await this.usersService.updateProfile(userId, dto);
    return { success: true, data, meta: this.buildMeta('update-profile') };
  }

  /**
   * 💡 [한글 주석] 비밀번호 변경 API (성공 시 204 No Content)
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updatePassword(
    @Req() req: Request,
    @Body() dto: UpdatePasswordDto,
  ) {
    const userId = (req as any).user.userId;
    await this.usersService.updatePassword(userId, dto);
  }

  /**
   * 💡 [한글 주석] 회원 탈퇴 API (성공 시 204 No Content)
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(@Req() req: Request) {
    const userId = (req as any).user.userId;
    await this.usersService.deleteAccount(userId);
  }
}
