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
exports.IngestCategoryTreeDto = exports.CategoryTreeNodeDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CategoryTreeNodeDto {
    ctgNo;
    name;
    parentNo;
    depth;
    path;
    leafYn;
}
exports.CategoryTreeNodeDto = CategoryTreeNodeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CategoryTreeNodeDto.prototype, "ctgNo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CategoryTreeNodeDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CategoryTreeNodeDto.prototype, "parentNo", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CategoryTreeNodeDto.prototype, "depth", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CategoryTreeNodeDto.prototype, "path", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['Y', 'N']),
    __metadata("design:type", String)
], CategoryTreeNodeDto.prototype, "leafYn", void 0);
class IngestCategoryTreeDto {
    categories;
}
exports.IngestCategoryTreeDto = IngestCategoryTreeDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(5000),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CategoryTreeNodeDto),
    __metadata("design:type", Array)
], IngestCategoryTreeDto.prototype, "categories", void 0);
//# sourceMappingURL=category-tree.dto.js.map