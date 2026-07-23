"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestPayloadDto = exports.CrawlerIngestDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class CrawlerStatisticsDto {
    avg_price;
    min_price;
    max_price;
    total_count;
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CrawlerStatisticsDto.prototype, "avg_price", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CrawlerStatisticsDto.prototype, "min_price", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CrawlerStatisticsDto.prototype, "max_price", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CrawlerStatisticsDto.prototype, "total_count", void 0);
class CrawlerItemMetadataDto {
    age;
    grade;
    mfg_date;
    expiry_date;
    weight_kg;
    sale_price;
    species;
    storage_type;
    haccp;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(40),
    __metadata("design:type", Object)
], CrawlerItemMetadataDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['1++', '1+', '1']),
    __metadata("design:type", Object)
], CrawlerItemMetadataDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CrawlerItemMetadataDto.prototype, "mfg_date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemMetadataDto.prototype, "expiry_date", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], CrawlerItemMetadataDto.prototype, "weight_kg", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Object)
], CrawlerItemMetadataDto.prototype, "sale_price", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['BEEF', 'PORK']),
    __metadata("design:type", String)
], CrawlerItemMetadataDto.prototype, "species", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['CHILLED', 'FROZEN']),
    __metadata("design:type", String)
], CrawlerItemMetadataDto.prototype, "storage_type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemMetadataDto.prototype, "haccp", void 0);
class CrawlerItemDto {
    name;
    price;
    brand;
    detail_url;
    goodsNo;
    metadata;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CrawlerItemDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemDto.prototype, "brand", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemDto.prototype, "detail_url", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerItemDto.prototype, "goodsNo", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CrawlerItemMetadataDto),
    __metadata("design:type", CrawlerItemMetadataDto)
], CrawlerItemDto.prototype, "metadata", void 0);
class CrawlerIngestDto {
    category_path;
    statistics;
    items;
}
exports.CrawlerIngestDto = CrawlerIngestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CrawlerIngestDto.prototype, "category_path", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CrawlerStatisticsDto),
    __metadata("design:type", CrawlerStatisticsDto)
], CrawlerIngestDto.prototype, "statistics", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CrawlerItemDto),
    __metadata("design:type", Array)
], CrawlerIngestDto.prototype, "items", void 0);
class IngestPayloadDto {
    data;
}
exports.IngestPayloadDto = IngestPayloadDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CrawlerIngestDto),
    __metadata("design:type", Array)
], IngestPayloadDto.prototype, "data", void 0);
//# sourceMappingURL=crawler-ingest.dto.js.map