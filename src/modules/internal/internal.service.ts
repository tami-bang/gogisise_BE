import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRawRecordBulkDto } from './dto/create-raw-record.dto';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  async createRawRecordsBulk(dto: CreateRawRecordBulkDto) {
    try {
      // Prisma의 createMany를 사용하여 벌크 인서트 수행
      const result = await this.prisma.rawRecord.createMany({
        data: dto.records.map((record) => ({
          sourceName: record.sourceName,
          collectedAt: new Date(record.collectedAt),
          rawProductName: record.rawProductName,
          price: record.price,
          species: record.species,
          storageType: record.storageType,
          grade: record.grade || null,
          ageInMonths: record.ageInMonths || null,
        })),
        skipDuplicates: true, // 중복 데이터 무시 옵션 (필요시)
      });

      return {
        totalReceived: dto.records.length,
        insertedCount: result.count,
        failedCount: dto.records.length - result.count,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        '벌크 적재 중 오류가 발생했습니다.',
      );
    }
  }
}
