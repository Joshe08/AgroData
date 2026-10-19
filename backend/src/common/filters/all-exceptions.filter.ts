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
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Error interno del servidor. Por favor intente nuevamente.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && res !== null ? (res as any).message || res : res;
    } else if (exception instanceof Error) {
      // Log internal error with stack trace internally, do not leak internal DB info to client
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      
      // Known safe messages or generic fallback
      if (exception.name === 'PrismaClientKnownRequestError') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Error en la solicitud a la base de datos. Verifique los datos enviados.';
      }
    } else {
      this.logger.error(`Unknown error at ${request.method} ${request.url}: ${String(exception)}`);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
