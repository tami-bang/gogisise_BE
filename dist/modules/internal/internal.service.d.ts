import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRawRecordBulkDto } from './dto/create-raw-record.dto';
export declare class InternalService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createRawRecordsBulk(dto: CreateRawRecordBulkDto): Promise<{
        totalReceived: number;
        insertedCount: number;
        failedCount: number;
    }>;
}
