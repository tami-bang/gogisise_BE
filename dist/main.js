"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const cookieParser = require('cookie-parser');
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./core/filters/global-exception.filter");
let cachedApp;
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        credentials: true,
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:5173',
                'http://localhost:3000',
            ];
            const isVercelDomain = origin?.endsWith('.vercel.app');
            if (!origin || allowedOrigins.includes(origin) || isVercelDomain) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
    });
    app.use(cookieParser());
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    if (!process.env.VERCEL) {
        const port = process.env.PORT || 8000;
        await app.listen(port);
    }
    else {
        await app.init();
        cachedApp = app.getHttpAdapter().getInstance();
    }
}
if (!process.env.VERCEL) {
    bootstrap();
}
exports.default = async (req, res) => {
    if (!cachedApp) {
        await bootstrap();
    }
    return cachedApp(req, res);
};
//# sourceMappingURL=main.js.map