export declare class CreateRawRecordDto {
    sourceName: string;
    collectedAt: string;
    rawProductName: string;
    pricePerKg: number;
    species: string;
    gender?: string | null;
    storageType: string;
    category: string;
    brand: string;
    qualityGrade?: string | null;
    yieldGrade?: string | null;
    ageMonths?: number | null;
}
export declare class CreateRawRecordBulkDto {
    records: CreateRawRecordDto[];
}
