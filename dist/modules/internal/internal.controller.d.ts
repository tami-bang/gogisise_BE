import { InternalService } from './internal.service';
import { CreateRawRecordBulkDto } from './dto/create-raw-record.dto';
export declare class InternalController {
    private readonly internalService;
    constructor(internalService: InternalService);
    createRawRecords(createRawRecordBulkDto: CreateRawRecordBulkDto): Promise<{
        success: boolean;
        data: {
            totalReceived: number;
            insertedCount: number;
            failedCount: number;
        };
        meta: {
            requestId: string;
            servedAt: string;
        };
    }>;
}
