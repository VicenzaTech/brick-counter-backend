import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const UNAUTH_MESSAGE = 'Unauthorized server';
const HEADER_KEY = 'x-internal-api-key';

@Injectable()
export class ServerAuthGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        const expectedKey =
            this.configService.get<string>('INTERNAL_SERVER_API_KEY');

        if (!expectedKey) {
            throw new UnauthorizedException(UNAUTH_MESSAGE);
        }

        const providedKey =
            (request.headers[HEADER_KEY] as string | undefined) ??
            (request.headers[HEADER_KEY.toUpperCase()] as string | undefined);

        if (!providedKey || providedKey !== expectedKey) {
            throw new UnauthorizedException(UNAUTH_MESSAGE);
        }

        return true;
    }
}

