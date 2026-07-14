import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InternalService } from './internal.service';
import { CreateRawRecordBulkDto } from './dto/create-raw-record.dto';
import { ApiKeyGuard } from '../../core/guards/api-key.guard';

@Controller('api/v1/internal/market')
@UseGuards(ApiKeyGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Post('raw-records')
  async createRawRecords(
    @Body() createRawRecordBulkDto: CreateRawRecordBulkDto,
  ) {
    const data = await this.internalService.createRawRecordsBulk(
      createRawRecordBulkDto,
    );

    return {
      success: true,
      data,
      meta: {
        requestId: `req_internal_bulk_${Date.now()}`,
        servedAt: new Date().toISOString(),
      },
    };
  }
}
