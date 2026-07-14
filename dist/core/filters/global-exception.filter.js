"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode = 'INTERNAL_SERVER_ERROR';
        let message = '서버 내부 오류가 발생했습니다.';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const responseBody = exception.getResponse();
            message =
                typeof responseBody === 'string'
                    ? responseBody
                    : responseBody.message || exception.message;
            errorCode = responseBody.errorCode || this.getErrorCodeFromStatus(status);
        }
        else {
            this.logger.error(`[${request.method}] ${request.url} - ${exception instanceof Error ? exception.message : String(exception)}`, exception instanceof Error ? exception.stack : '');
        }
        response.status(status).json({
            success: false,
            error: {
                errorCode,
                message,
            },
            meta: {
                requestId: request.headers['x-request-id'] || `req_${Date.now()}`,
                servedAt: new Date().toISOString(),
            },
        });
    }
    getErrorCodeFromStatus(status) {
        switch (status) {
            case 400:
                return 'INVALID_REQUEST_BODY';
            case 401:
                return 'AUTHENTICATION_REQUIRED';
            case 403:
                return 'FORBIDDEN_ACTION';
            case 404:
                return 'NOT_FOUND';
            case 409:
                return 'CONFLICT';
            case 429:
                return 'TOO_MANY_REQUESTS';
            default:
                return 'UNKNOWN_ERROR';
        }
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=global-exception.filter.js.map