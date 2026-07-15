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
var TasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const crawler_service_1 = require("../crawler/crawler.service");
const internal_service_1 = require("../internal/internal.service");
const market_service_1 = require("../market/market.service");
let TasksService = TasksService_1 = class TasksService {
    crawlerService;
    internalService;
    marketService;
    logger = new common_1.Logger(TasksService_1.name);
    constructor(crawlerService, internalService, marketService) {
        this.crawlerService = crawlerService;
        this.internalService = internalService;
        this.marketService = marketService;
    }
    async handleHybridMilestoneScan() {
        this.logger.log('하이브리드 마일스톤 스캔 시작...');
        try {
            const latestCounts = await this.crawlerService.peekLatestMetadata();
            const savedCounts = await this.crawlerService.getLastTotalCounts();
            let hasChanged = false;
            if (!savedCounts) {
                hasChanged = true;
            }
            else {
                for (const [ctgNo, count] of Object.entries(latestCounts)) {
                    if (savedCounts[ctgNo] !== count) {
                        hasChanged = true;
                        this.logger.log(`카테고리 ${ctgNo} 개수 변경 감지: ${savedCounts[ctgNo]} -> ${count}`);
                        break;
                    }
                }
            }
            if (!hasChanged) {
                this.logger.log('데이터 변동 없음. 전체 크롤링 스킵.');
                await this.crawlerService.updateLastCheckedAt();
                return;
            }
            this.logger.log('데이터 변동 확인. 전체 수집 실행...');
            const outcome = await this.crawlerService.runFullCrawl();
            if (outcome.records && outcome.records.length > 0) {
                this.logger.log(`${outcome.records.length}건 Bulk Upsert 시작...`);
                const chunkSize = 100;
                let totalInserted = 0;
                for (let i = 0; i < outcome.records.length; i += chunkSize) {
                    const chunk = outcome.records.slice(i, i + chunkSize);
                    const result = await this.internalService.createRawRecordsBulk({ records: chunk });
                    totalInserted += result.insertedCount;
                }
                this.logger.log(`Bulk Upsert 완료: ${totalInserted}건 삽입 (중복 제외)`);
                await this.marketService.processRawRecordsIntoMarketItems();
            }
            await this.crawlerService.saveLastTotalCounts(latestCounts);
            this.logger.log('하이브리드 마일스톤 스캔 완료');
        }
        catch (error) {
            this.logger.error('마일스톤 스캔 실패', error);
        }
    }
};
exports.TasksService = TasksService;
__decorate([
    (0, schedule_1.Cron)('0 10,14,18 * * *', { timeZone: 'Asia/Seoul' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksService.prototype, "handleHybridMilestoneScan", null);
exports.TasksService = TasksService = TasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [crawler_service_1.CrawlerService,
        internal_service_1.InternalService,
        market_service_1.MarketService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map