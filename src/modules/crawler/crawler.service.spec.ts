import { CrawlerService } from './crawler.service';

describe('CrawlerService bulk ingest', () => {
  it('기존 가격 조회와 두 번의 벌크 SQL로 청크를 적재한다', async () => {
    const tx = {
      marketItem: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ goodsNo: 'GOODS-1', price: 99000 }]),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        { goodsNo: 'GOODS-1', itemId: 'item-1' },
        { goodsNo: 'GOODS-2', itemId: 'item-2' },
      ]),
      $executeRaw: jest.fn().mockResolvedValue(2),
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new CrawlerService(prisma as any, {} as any);

    await service.processIngestedData({
      category_path: '국내산 한우,국내산 한우 암소,39.9,안심',
      statistics: {
        avg_price: 105000,
        min_price: 100000,
        max_price: 110000,
        total_count: 2,
      },
      items: [
        {
          name: '기존 상품',
          price: 100000,
          brand: '금천한우',
          detail_url: 'https://example.com/1',
          goodsNo: 'GOODS-1',
          metadata: {
            age: 30,
            grade: '1++',
            mfg_date: '20260710',
            expiry_date: '20260907',
            weight_kg: 3.6,
            sale_price: 360000,
            species: 'BEEF',
            storage_type: 'CHILLED',
          },
        },
        {
          name: '신규 상품',
          price: 110000,
          brand: '금천한우',
          detail_url: 'https://example.com/2',
          goodsNo: 'GOODS-2',
          metadata: {
            age: 28,
            grade: '1+',
            mfg_date: '20260711',
            expiry_date: '20260908',
            weight_kg: 4,
            sale_price: 440000,
            species: 'BEEF',
            storage_type: 'CHILLED',
          },
        },
      ],
    });

    expect(tx.marketItem.findMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);

    const priceSql = tx.$executeRaw.mock.calls[0][0];
    expect(priceSql.values).toContain(99000);
    expect(priceSql.values).toContain(null);
  });

  it('전체 수집 목록에 없는 ACTIVE 상품만 비활성화한다', async () => {
    const prisma = { $executeRaw: jest.fn().mockResolvedValue(7) };
    const service = new CrawlerService(prisma as any, {} as any);

    await expect(
      service.finalizeCrawl(['GOODS-2', 'GOODS-1', 'GOODS-1']),
    ).resolves.toBe(7);

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const sql = prisma.$executeRaw.mock.calls[0][0];
    expect(sql.values).toContain('["GOODS-2","GOODS-1"]');
  });

  it('빈 전체 수집 목록으로는 비활성화를 실행하지 않는다', async () => {
    const prisma = { $executeRaw: jest.fn() };
    const service = new CrawlerService(prisma as any, {} as any);

    await expect(service.finalizeCrawl([])).rejects.toThrow(
      '수집 상품 목록이 비어 있어 단종 동기화를 중단했습니다.',
    );
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });
});
