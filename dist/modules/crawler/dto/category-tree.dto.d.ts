export declare class CategoryTreeNodeDto {
    ctgNo: string;
    name: string;
    parentNo: string | null;
    depth: number;
    path: string;
    leafYn: 'Y' | 'N';
}
export declare class IngestCategoryTreeDto {
    categories: CategoryTreeNodeDto[];
}
