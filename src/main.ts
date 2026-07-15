import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser'); // 쿠키에서 refreshToken을 읽기 위한 미들웨어
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

let cachedApp: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 글로벌 CORS 허용 설정 (프론트엔드 도메인에서 쿠키를 주고받으려면 credentials: true 필요)
  // 글로벌 CORS 허용 설정 (프론트엔드 도메인에서 쿠키를 주고받으려면 credentials: true 필요)
  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
      ];
      // Vercel 배포 도메인 전체 허용 (FE 재배포 시 URL 변경 대응)
      const isVercelDomain = origin?.endsWith('.vercel.app');
      if (!origin || allowedOrigins.includes(origin) || isVercelDomain) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  });

  // cookie-parser: req.cookies 객체를 사용할 수 있게 해주는 미들웨어
  app.use(cookieParser());

  // 글로벌 예외 필터 등록
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 글로벌 ValidationPipe 등록 (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!process.env.VERCEL) {
    const port = process.env.PORT || 8000;
    await app.listen(port);
  } else {
    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
}

// 로컬 환경일 경우 기존처럼 포트 바인딩 실행
if (!process.env.VERCEL) {
  bootstrap();
}

// Vercel Serverless Function 진입점을 위한 핸들러 내보내기
export default async (req: any, res: any) => {
  if (!cachedApp) {
    await bootstrap();
  }
  return cachedApp(req, res);
};
