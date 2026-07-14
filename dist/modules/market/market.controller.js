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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketController = void 0;
const common_1 = require("@nestjs/common");
const market_service_1 = require("./market.service");
let MarketController = class MarketController {
    marketService;
    constructor(marketService) {
        this.marketService = marketService;
    }
    async getAllMarketItems() {
        const data = await this.marketService.getAllMarketItems();
        return {
            success: true,
            data,
            meta: {
                requestId: `req_market_list_${Date.now()}`,
                servedAt: new Date().toISOString(),
            },
        };
    }
    async getItemCalculations(itemId) {
        const data = await this.marketService.getItemCalculations(itemId);
        return {
            success: true,
            data,
            meta: {
                requestId: `req_market_calc_${Date.now()}`,
                servedAt: new Date().toISOString(),
            },
        };
    }
    async getItemPriceHistory(itemId) {
        const data = await this.marketService.getItemPriceHistory(itemId);
        return {
            success: true,
            data,
            meta: {
                requestId: `req_market_hist_${Date.now()}`,
                servedAt: new Date().toISOString(),
            },
        };
    }
};
exports.MarketController = MarketController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getAllMarketItems", null);
__decorate([
    (0, common_1.Get)(':itemId/calculations'),
    __param(0, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getItemCalculations", null);
__decorate([
    (0, common_1.Get)(':itemId/price-history'),
    __param(0, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketController.prototype, "getItemPriceHistory", null);
exports.MarketController = MarketController = __decorate([
    (0, common_1.Controller)('api/v1/market/items'),
    __metadata("design:paramtypes", [market_service_1.MarketService])
], MarketController);
//# sourceMappingURL=market.controller.js.map