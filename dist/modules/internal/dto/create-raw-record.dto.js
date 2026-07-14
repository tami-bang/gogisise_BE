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
exports.CreateRawRecordBulkDto = exports.CreateRawRecordDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateRawRecordDto {
    sourceName;
    collectedAt;
    rawProductName;
    price;
    species;
    storageType;
    grade;
    ageInMonths;
}
exports.CreateRawRecordDto = CreateRawRecordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Equals)('GEUMCHEON', {
        message: 'sourceName은 반드시 GEUMCHEON 이어야 합니다.',
    }),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "sourceName", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'collectedAt은 유효한 ISO 8601 날짜 문자열이어야 합니다.' }),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "collectedAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "rawProductName", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateRawRecordDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['BEEF', 'PORK'], {
        message: 'species는 BEEF 또는 PORK 중 하나여야 합니다.',
    }),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "species", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['CHILLED', 'FROZEN'], {
        message: 'storageType은 CHILLED 또는 FROZEN 중 하나여야 합니다.',
    }),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "storageType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.species === 'BEEF'),
    (0, class_validator_1.IsInt)({
        message: '한우(BEEF)의 경우 ageInMonths(월령)는 필수 정수여야 합니다.',
    }),
    __metadata("design:type", Number)
], CreateRawRecordDto.prototype, "ageInMonths", void 0);
class CreateRawRecordBulkDto {
    records;
}
exports.CreateRawRecordBulkDto = CreateRawRecordBulkDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateRawRecordDto),
    __metadata("design:type", Array)
], CreateRawRecordBulkDto.prototype, "records", void 0);
//# sourceMappingURL=create-raw-record.dto.js.map