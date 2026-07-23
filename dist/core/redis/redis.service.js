"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    logger = new common_1.Logger(RedisService_1.name);
    client = null;
    onModuleInit() {
        const host = process.env.REDIS_HOST || '';
        const isDummy = host.includes('your-production-redis-host') || !host;
        if (isDummy) {
            this.logger.warn('⚠️ Redis 호스트가 비어있거나 더미 주소이므로 비활성화(Disable) 처리하고 Fallback(우회) 모드로 작동합니다.');
            this.client = null;
            return;
        }
        try {
            this.client = new ioredis_1.default({
                host,
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                connectTimeout: 1000,
                maxRetriesPerRequest: 1,
                retryStrategy: (times) => {
                    if (times > 1) {
                        return null;
                    }
                    return 50;
                },
            });
            this.client.on('connect', () => {
                this.logger.log('✅ Redis 연결 성공');
            });
            this.client.on('error', (err) => {
                this.logger.error('❌ Redis 연결 에러 (Fallback 모드로 계속 진행합니다)', err);
            });
        }
        catch (e) {
            this.client = null;
            this.logger.error('❌ Redis 초기화 중 런타임 에러 발생 (Fallback 모드로 계속 진행합니다)', e);
        }
    }
    onModuleDestroy() {
        if (this.client) {
            this.client.quit();
        }
    }
    async get(key) {
        if (!this.client)
            return null;
        try {
            return await this.client.get(key);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] get failed for key: ${key}`, err);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        if (!this.client)
            return;
        try {
            if (ttlSeconds) {
                await this.client.set(key, value, 'EX', ttlSeconds);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] set failed for key: ${key}`, err);
        }
    }
    async del(key) {
        if (!this.client)
            return;
        try {
            await this.client.del(key);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] del failed for key: ${key}`, err);
        }
    }
    async keys(pattern) {
        if (!this.client)
            return [];
        try {
            return await this.client.keys(pattern);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] keys failed for pattern: ${pattern}`, err);
            return [];
        }
    }
    async lpush(key, value) {
        if (!this.client)
            return 0;
        try {
            return await this.client.lpush(key, value);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] lpush failed for key: ${key}`, err);
            return 0;
        }
    }
    async lrange(key, start, stop) {
        if (!this.client)
            return [];
        try {
            return await this.client.lrange(key, start, stop);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] lrange failed for key: ${key}`, err);
            return [];
        }
    }
    async ltrim(key, start, stop) {
        if (!this.client)
            return 'OK';
        try {
            return await this.client.ltrim(key, start, stop);
        }
        catch (err) {
            this.logger.error(`[Redis Fallback] ltrim failed for key: ${key}`, err);
            return 'OK';
        }
    }
    multi() {
        if (!this.client) {
            return {
                exec: () => Promise.resolve([]),
            };
        }
        try {
            return this.client.multi();
        }
        catch (err) {
            this.logger.error('[Redis Fallback] multi failed', err);
            return {
                exec: () => Promise.resolve([]),
            };
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)()
], RedisService);
//# sourceMappingURL=redis.service.js.map