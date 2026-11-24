import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { map, type Observable } from "rxjs";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: "success",
        data: data ?? null,
        requestId,
      })),
    );
  }
}
