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
exports.SendResetLinkDto = exports.FindEmailDto = exports.KakaoLoginDto = exports.LoginDto = exports.SignupDto = void 0;
const class_validator_1 = require("class-validator");
class SignupDto {
    email;
    password;
    nickname;
}
exports.SignupDto = SignupDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: '유효한 이메일 형식이어야 합니다.' }),
    __metadata("design:type", String)
], SignupDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' }),
    (0, class_validator_1.MaxLength)(64, { message: '비밀번호는 최대 64자 이하이어야 합니다.' }),
    __metadata("design:type", String)
], SignupDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' }),
    (0, class_validator_1.MaxLength)(20, { message: '닉네임은 최대 20자 이하이어야 합니다.' }),
    __metadata("design:type", String)
], SignupDto.prototype, "nickname", void 0);
class LoginDto {
    email;
    password;
    autoLogin;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: '유효한 이메일 형식이어야 합니다.' }),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], LoginDto.prototype, "autoLogin", void 0);
class KakaoLoginDto {
    kakaoAccessToken;
}
exports.KakaoLoginDto = KakaoLoginDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], KakaoLoginDto.prototype, "kakaoAccessToken", void 0);
class FindEmailDto {
    phone;
}
exports.FindEmailDto = FindEmailDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], FindEmailDto.prototype, "phone", void 0);
class SendResetLinkDto {
    email;
}
exports.SendResetLinkDto = SendResetLinkDto;
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: '유효한 이메일 형식이어야 합니다.' }),
    __metadata("design:type", String)
], SendResetLinkDto.prototype, "email", void 0);
//# sourceMappingURL=auth.dto.js.map