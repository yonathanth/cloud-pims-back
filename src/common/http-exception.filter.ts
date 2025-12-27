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
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;
        errorDetails = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        message: exception.message,
        stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    // Log the error with full details
    this.logger.error(
      `❌ ${request.method} ${request.url} - Status: ${status}`,
      {
        message,
        errorDetails,
        stack: exception instanceof Error ? exception.stack : undefined,
        body: request.body ? JSON.stringify(request.body).substring(0, 500) : undefined,
        params: request.params,
        query: request.query,
      },
    );

    // Return a structured error response
    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errorDetails && typeof errorDetails === 'object' && { details: errorDetails }),
    });
  }
}

