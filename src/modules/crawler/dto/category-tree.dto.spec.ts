import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IngestCategoryTreeDto } from './category-tree.dto';

describe('IngestCategoryTreeDto', () => {
  it('accepts the crawler flat-node contract including leafYn', async () => {
    const dto = plainToInstance(IngestCategoryTreeDto, {
      categories: Array.from({ length: 2397 }, (_, index) => ({
        ctgNo: String(index + 1),
        name: `category-${index + 1}`,
        parentNo: index === 0 ? null : '1',
        depth: index === 0 ? 1 : 2,
        path: `root,category-${index + 1}`,
        leafYn: index % 2 === 0 ? 'Y' : 'N',
      })),
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
