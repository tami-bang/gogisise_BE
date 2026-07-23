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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CrawlerController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerController = void 0;
const common_1 = require("@nestjs/common");
const crawler_service_1 = require("./crawler.service");
const category_tree_dto_1 = require("./dto/category-tree.dto");
const crawler_ingest_dto_1 = require("./dto/crawler-ingest.dto");
const finalize_crawl_dto_1 = require("./dto/finalize-crawl.dto");
let CrawlerController = CrawlerController_1 = class CrawlerController {
    crawlerService;
    logger = new common_1.Logger(CrawlerController_1.name);
    constructor(crawlerService) {
        this.crawlerService = crawlerService;
    }
    async ingest(payload) {
        const dataList = payload.data;
        this.logger.log(`Received ${dataList?.length || 0} category results from crawler.`);
        let totalUpserted = 0;
        for (const data of dataList) {
            if (data.items && data.items.length > 0) {
                await this.crawlerService.processIngestedData(data);
                totalUpserted += data.items.length;
            }
        }
        this.logger.log(`Ingest complete. Upserted ${totalUpserted} total items.`);
        return { success: true, upserted: totalUpserted };
    }
    async finalize(dto) {
        const deactivated = await this.crawlerService.finalizeCrawl(dto.goodsNos);
        return { success: true, deactivated };
    }
    async ingestCategoryTree(dto) {
        this.logger.log(`Received category tree sync request with ${dto.categories?.length || 0} categories.`);
        await this.crawlerService.processCategoryTree(dto);
        return { success: true };
    }
};
exports.CrawlerController = CrawlerController;
__decorate([
    (0, common_1.Post)('ingest'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [crawler_ingest_dto_1.IngestPayloadDto]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "ingest", null);
__decorate([
    (0, common_1.Post)('finalize'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [finalize_crawl_dto_1.FinalizeCrawlDto]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)('category-tree'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [category_tree_dto_1.IngestCategoryTreeDto]),
    __metadata("design:returntype", Promise)
], CrawlerController.prototype, "ingestCategoryTree", null);
exports.CrawlerController = CrawlerController = CrawlerController_1 = __decorate([
    (0, common_1.Controller)('crawler'),
    __metadata("design:paramtypes", [crawler_service_1.CrawlerService])
], CrawlerController);
//# sourceMappingURL=crawler.controller.js.map