"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CrawlerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrawlerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let CrawlerService = CrawlerService_1 = class CrawlerService {
    prisma;
    logger = new common_1.Logger(CrawlerService_1.name);
    pythonScriptPath = path.resolve(process.cwd(), 'src/crawler/python/run.py');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async peekLatestMetadata() {
        try {
            this.logger.log('파이썬 크롤러(peek 모드) 실행 중...');
            const { stdout } = await execAsync(`python3 "${this.pythonScriptPath}" --action peek`);
            const result = JSON.parse(stdout);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        }
        catch (error) {
            this.logger.error('크롤러 peek 실행 실패', error);
            throw error;
        }
    }
    async runFullCrawl() {
        try {
            this.logger.log('파이썬 크롤러(crawl 모드) 실행 중...');
            const { stdout } = await execAsync(`python3 "${this.pythonScriptPath}" --action crawl`, { maxBuffer: 1024 * 1024 * 50 });
            const result = JSON.parse(stdout);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data;
        }
        catch (error) {
            this.logger.error('크롤러 crawl 실행 실패', error);
            throw error;
        }
    }
    async getLastTotalCounts() {
        const meta = await this.prisma.crawlerMetadata.findUnique({
            where: { id: 1 },
        });
        return meta ? meta.lastTotalCounts : null;
    }
    async saveLastTotalCounts(counts) {
        await this.prisma.crawlerMetadata.upsert({
            where: { id: 1 },
            update: {
                lastTotalCounts: counts,
                lastUpdatedAt: new Date(),
                lastCheckedAt: new Date(),
            },
            create: {
                id: 1,
                lastTotalCounts: counts,
            },
        });
    }
    async updateLastCheckedAt() {
        await this.prisma.crawlerMetadata.upsert({
            where: { id: 1 },
            update: { lastCheckedAt: new Date() },
            create: { id: 1, lastTotalCounts: {} },
        });
    }
};
exports.CrawlerService = CrawlerService;
exports.CrawlerService = CrawlerService = CrawlerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrawlerService);
//# sourceMappingURL=crawler.service.js.map