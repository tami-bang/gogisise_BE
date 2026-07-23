declare class CrawlerStatisticsDto {
    avg_price: number;
    min_price: number;
    max_price: number;
    total_count: number;
}
declare class CrawlerItemMetadataDto {
    age: number | null;
    grade?: string | null;
    mfg_date?: string | null;
    expiry_date?: string;
    weight_kg: number;
    sale_price?: number | null;
    species: 'BEEF' | 'PORK';
    storage_type: 'CHILLED' | 'FROZEN';
    haccp?: string;
}
declare class CrawlerItemDto {
    name: string;
    price: number;
    brand: string;
    detail_url: string;
    goodsNo: string;
    metadata: CrawlerItemMetadataDto;
}
export declare class CrawlerIngestDto {
    category_path: string;
    statistics: CrawlerStatisticsDto;
    items: CrawlerItemDto[];
}
export declare class IngestPayloadDto {
    data: CrawlerIngestDto[];
}
export {};
