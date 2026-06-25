import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiEnvelope<T = unknown> {
  statusCode: number;
  message: string;
  data: T | null;
  meta: Record<string, unknown> | null;
}

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiEnvelope> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((result): ApiEnvelope => {
        const statusCode = response.statusCode;

        // Message-only response: { message: string } với đúng 1 key
        if (
          result &&
          typeof result === 'object' &&
          'message' in result &&
          Object.keys(result as object).length === 1
        ) {
          return {
            statusCode,
            message: (result as { message: string }).message,
            data: null,
            meta: null,
          };
        }

        // Paginated response: có fields items + total + page + limit
        if (
          result &&
          typeof result === 'object' &&
          'items' in result &&
          'total' in result
        ) {
          const { items, ...pagination } = result as Record<string, unknown>;
          return {
            statusCode,
            message: 'Success',
            data: items,
            meta: pagination,
          };
        }

        // Data response thông thường (DTO, entity, v.v.)
        return {
          statusCode,
          message: 'Success',
          data: result ?? null,
          meta: null,
        };
      }),
    );
  }
}
