export class CrawlerIngestDto {
  category_path: string;
  statistics: {
    avg_price: number;
    min_price: number;
    max_price: number;
    total_count: number;
  };
  items: Array<{
    name: string;
    price: number;
    brand: string;
    detail_url: string;
    goodsNo: string;
    metadata: { age: number | null; mfg_date: string; haccp?: string };
  }>;
}
