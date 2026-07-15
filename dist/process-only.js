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
const prisma_service_1 = require("./core/prisma/prisma.service");
const market_module_1 = require("./modules/market/market.module");
const market_service_1 = require("./modules/market/market.service");
let StandaloneAppModule = class StandaloneAppModule {
};
StandaloneAppModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, market_module_1.MarketModule],
    })
], StandaloneAppModule);
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(StandaloneAppModule);
    console.log('🚀 기존 적재 데이터 재가공 스크립트를 시작합니다...');
    try {
        const prismaService = app.get(prisma_service_1.PrismaService);
        const marketService = app.get(market_service_1.MarketService);
        console.log('1. 수집 기록이 존재하는 고유 날짜 목록을 조회 중...');
        const uniqueDates = await prismaService.$queryRaw `
      SELECT DISTINCT DATE_TRUNC('day', "collectedAt") as date 
      FROM "Raw_Records"
      ORDER BY date ASC
    `;
        console.log(`조회 완료: 총 ${uniqueDates.length}개의 날짜가 식별되었습니다.`);
        for (let i = 0; i < uniqueDates.length; i++) {
            const targetDate = new Date(uniqueDates[i].date);
            const dateString = targetDate.toISOString().split('T')[0];
            console.log(`[${i + 1}/${uniqueDates.length}] ${dateString} 시세 데이터 가공 시작...`);
            await marketService.processRawRecordsIntoMarketItems(targetDate);
        }
        console.log('✨ 모든 시세 데이터 재가공이 성공적으로 완료되었습니다!');
    }
    catch (err) {
        console.error('재가공 중 오류 발생:', err);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=process-only.js.map