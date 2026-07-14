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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const analytics_dto_1 = require("./dto/analytics.dto");
const jwt_auth_guard_1 = require("../../core/guards/jwt-auth.guard");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    buildMeta(prefix) {
        return {
            requestId: `req_${prefix}_${Date.now()}`,
            servedAt: new Date().toISOString(),
        };
    }
    async logView(req, dto) {
        const userId = req.user.userId;
        await this.analyticsService.logView(userId, dto.itemId);
        return {
            success: true,
            data: null,
            meta: this.buildMeta('analytics-view'),
        };
    }
    async getFrequentItems() {
        const items = await this.analyticsService.getFrequentItems(10);
        return {
            success: true,
            data: { items },
            meta: this.buildMeta('frequent-items'),
        };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('view'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analytics_dto_1.ViewLogDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "logView", null);
__decorate([
    (0, common_1.Get)('frequent-items'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getFrequentItems", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('api/v1/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map