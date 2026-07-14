import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser'); // 쿠키에서 refreshToken을 읽기 위한 미들웨어
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 글로벌 CORS 허용 설정 (프론트엔드 도메인에서 쿠키를 주고받으려면 credentials: true 필요)
  app.enableCors({ credentials: true, origin: ['http://localhost:5173'] });

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

  const port = process.env.PORT || 8000;
  await app.listen(port);
}
bootstrap();
