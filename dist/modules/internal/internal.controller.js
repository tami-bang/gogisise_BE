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
exports.InternalController = void 0;
const common_1 = require("@nestjs/common");
const internal_service_1 = require("./internal.service");
const create_raw_record_dto_1 = require("./dto/create-raw-record.dto");
const api_key_guard_1 = require("../../core/guards/api-key.guard");
let InternalController = class InternalController {
    internalService;
    constructor(internalService) {
        this.internalService = internalService;
    }
    async createRawRecords(createRawRecordBulkDto) {
        const data = await this.internalService.createRawRecordsBulk(createRawRecordBulkDto);
        return {
            success: true,
            data,
            meta: {
                requestId: `req_internal_bulk_${Date.now()}`,
                servedAt: new Date().toISOString(),
            },
        };
    }
};
exports.InternalController = InternalController;
__decorate([
    (0, common_1.Post)('raw-records'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_raw_record_dto_1.CreateRawRecordBulkDto]),
    __metadata("design:returntype", Promise)
], InternalController.prototype, "createRawRecords", null);
exports.InternalController = InternalController = __decorate([
    (0, common_1.Controller)('api/v1/internal/market'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    __metadata("design:paramtypes", [internal_service_1.InternalService])
], InternalController);
//# sourceMappingURL=internal.controller.js.map