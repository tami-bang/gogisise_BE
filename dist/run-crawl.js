"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("./core/prisma/prisma.module");
const crawler_module_1 = require("./modules/crawler/crawler.module");
const crawler_service_1 = require("./modules/crawler/crawler.service");
const internal_module_1 = require("./modules/internal/internal.module");
const internal_service_1 = require("./modules/internal/internal.service");
const market_module_1 = require("./modules/market/market.module");
const market_service_1 = require("./modules/market/market.service");
let StandaloneAppModule = class StandaloneAppModule {
};
StandaloneAppModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, crawler_module_1.CrawlerModule, internal_module_1.InternalModule, market_module_1.MarketModule],
    })
], StandaloneAppModule);
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(StandaloneAppModule);
    console.log('🚀 수동 크롤링 스캔을 시작합니다...');
    try {
        const crawlerService = app.get(crawler_service_1.CrawlerService);
        const internalService = app.get(internal_service_1.InternalService);
        const marketService = app.get(market_service_1.MarketService);
        console.log('1. 전체 크롤링 강제 실행 (변동 여부 무시)...');
        const outcome = await crawlerService.runFullCrawl();
        if (outcome.records && outcome.records.length > 0) {
            console.log(`2. ${outcome.records.length}건 Bulk Upsert 시작...`);
            const chunkSize = 100;
            let totalInserted = 0;
            for (let i = 0; i < outcome.records.length; i += chunkSize) {
                const chunk = outcome.records.slice(i, i + chunkSize);
                const result = await internalService.createRawRecordsBulk({ records: chunk });
                totalInserted += result.insertedCount;
            }
            console.log(`Bulk Upsert 완료: ${totalInserted}건 삽입`);
            console.log('3. MarketService 가공 시작...');
            await marketService.processRawRecordsIntoMarketItems();
            console.log('가공 완료!');
        }
        else {
            console.log('수집된 데이터가 없습니다.');
        }
    }
    catch (err) {
        console.error('크롤링 중 에러 발생:', err);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=run-crawl.js.map