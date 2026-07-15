export declare class CreateRawRecordDto {
    sourceName: string;
    collectedAt: string;
    rawProductName: string;
    price: number;
    species: string;
    storageType: string;
    grade?: string | null;
    ageInMonths?: number | null;
}
export declare class CreateRawRecordBulkDto {
    records: CreateRawRecordDto[];
}
