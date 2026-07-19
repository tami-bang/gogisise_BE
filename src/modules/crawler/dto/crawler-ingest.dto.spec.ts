import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IngestPayloadDto } from './crawler-ingest.dto';

const validItem = {
  name: '금천한우암소안심',
  price: 102900,
  brand: '금천한우',
  detail_url: 'https://www.ekcm.co.kr/product/1',
  goodsNo: 'GOODS-1',
  metadata: {
    age: 30,
    grade: '1++',
    mfg_date: '20260710',
    expiry_date: '20260907',
    weight_kg: 3.6,
    sale_price: 370440,
    species: 'BEEF',
    storage_type: 'CHILLED',
  },
};

const payload = (items = [validItem]) => ({
  data: [
    {
      category_path: '국내산 한우,국내산 한우 암소,39.9,안심',
      statistics: {
        avg_price: 102900,
        min_price: 102900,
        max_price: 102900,
        total_count: items.length,
      },
      items,
    },
  ],
});

describe('IngestPayloadDto', () => {
  it('유효한 중첩 상품 배열을 검증한다', async () => {
    const dto = plainToInstance(IngestPayloadDto, payload());
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });

  it('알 수 없는 필드와 100건 초과 청크를 거부한다', async () => {
    const dto = plainToInstance(IngestPayloadDto, {
      ...payload(Array.from({ length: 101 }, () => validItem)),
      unexpected: true,
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
