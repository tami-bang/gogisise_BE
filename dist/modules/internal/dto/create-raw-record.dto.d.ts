export declare class CreateRawRecordDto {
    sourceName: string;
    collectedAt: string;
    rawProductName: string;
    price: number;
    species: string;
    storageType: string;
    grade?: string;
    ageInMonths?: number;
}
export declare class CreateRawRecordBulkDto {
    records: CreateRawRecordDto[];
}
