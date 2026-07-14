import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = '서버 내부 오류가 발생했습니다.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody: any = exception.getResponse();
      message =
        typeof responseBody === 'string'
          ? responseBody
          : responseBody.message || exception.message;
      errorCode = responseBody.errorCode || this.getErrorCodeFromStatus(status);
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} - ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : '',
      );
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

  private getErrorCodeFromStatus(status: number): string {
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
}
