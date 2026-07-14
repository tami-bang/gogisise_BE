import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { ViewLogDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  private buildMeta(prefix: string) {
    return {
      requestId: `req_${prefix}_${Date.now()}`,
      servedAt: new Date().toISOString(),
    };
  }

  /**
   * 품목 조회 로그 기록 (데이터 폭발 통제 - Redis 버퍼링)
   * 프론트엔드의 디바운싱 요청을 받아 초고속 메모리에 적재
   */
  @Post('view')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logView(@Req() req: Request, @Body() dto: ViewLogDto) {
    // JwtAuthGuard를 통과했으므로 req.user에 userId가 보장됨
    const userId = (req as any).user.userId;

    // DB 조회 없이 즉시 Redis 큐에 넣고 응답 (Zero-Delay 응답)
    await this.analyticsService.logView(userId, dto.itemId);

    return {
      success: true,
      data: null,
      meta: this.buildMeta('analytics-view'),
    };
  }

  /**
   * 자주 보는 품목 TOP N 목록 조회
   */
  @Get('frequent-items')
  async getFrequentItems() {
    const items = await this.analyticsService.getFrequentItems(10);

    return {
      success: true,
      data: { items },
      meta: this.buildMeta('frequent-items'),
    };
  }
}
