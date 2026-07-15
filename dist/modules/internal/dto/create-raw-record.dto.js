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
function IsValidAgeForSpecies(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isValidAgeForSpecies',
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const species = args.object.species;
                    return species === 'PORK'
                        ? value == null
                        : value == null || Number.isInteger(value);
                },
                defaultMessage(args) {
                    return args.object.species === 'PORK'
                        ? 'ageInMonths must be null for PORK'
                        : 'ageInMonths must be an integer when provided';
                },
            },
        });
    };
}
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
    (0, class_validator_1.Equals)('GEUMCHEON'),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "sourceName", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'collectedAt must be a valid ISO 8601 timestamp' }),
    (0, class_validator_1.Matches)(/\+09:00$/, { message: 'collectedAt must use the +09:00 KST offset' }),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "collectedAt", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Matches)(/\S/, { message: 'rawProductName must contain a non-space character' }),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "rawProductName", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateRawRecordDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['BEEF', 'PORK']),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "species", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['CHILLED', 'FROZEN']),
    __metadata("design:type", String)
], CreateRawRecordDto.prototype, "storageType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(50),
    __metadata("design:type", Object)
], CreateRawRecordDto.prototype, "grade", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(240),
    IsValidAgeForSpecies(),
    __metadata("design:type", Object)
], CreateRawRecordDto.prototype, "ageInMonths", void 0);
class CreateRawRecordBulkDto {
    records;
}
exports.CreateRawRecordBulkDto = CreateRawRecordBulkDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(100),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateRawRecordDto),
    __metadata("design:type", Array)
], CreateRawRecordBulkDto.prototype, "records", void 0);
//# sourceMappingURL=create-raw-record.dto.js.map