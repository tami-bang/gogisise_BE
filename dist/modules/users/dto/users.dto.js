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
exports.UpdatePasswordDto = exports.UpdateProfileDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateProfileDto {
    email;
    nickname;
    phone;
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: '유효한 이메일 형식이어야 합니다.' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: '닉네임은 문자열이어야 합니다.' }),
    (0, class_validator_1.MinLength)(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' }),
    (0, class_validator_1.MaxLength)(20, { message: '닉네임은 최대 20자 이하이어야 합니다.' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "nickname", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: '휴대폰 번호는 문자열이어야 합니다.' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
class UpdatePasswordDto {
    currentPassword;
    newPassword;
    newPasswordConfirm;
}
exports.UpdatePasswordDto = UpdatePasswordDto;
__decorate([
    (0, class_validator_1.IsString)({ message: '현재 비밀번호를 입력해 주세요.' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '새 비밀번호는 최소 8자 이상이어야 합니다.' }),
    (0, class_validator_1.MaxLength)(64, { message: '새 비밀번호는 최대 64자 이하이어야 합니다.' }),
    (0, class_validator_1.Matches)(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
        message: '새 비밀번호는 8자 이상이며, 영문자와 숫자를 최소 1개 이상 포함해야 합니다.',
    }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)({ message: '새 비밀번호 확인을 입력해 주세요.' }),
    __metadata("design:type", String)
], UpdatePasswordDto.prototype, "newPasswordConfirm", void 0);
//# sourceMappingURL=users.dto.js.map