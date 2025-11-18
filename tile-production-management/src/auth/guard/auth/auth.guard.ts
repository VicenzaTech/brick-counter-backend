import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IJWTPayload } from 'src/auth/auth.constant';
import { UsersService } from 'src/users/users.service';

const UNAUTH_MESSAGE = 'Unauthorized';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userService: UsersService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest<Request>();

        const authHeader =
            (request.headers['authorization'] as string | undefined) ??
            (request.headers['Authorization'] as string | undefined);

        if (!authHeader) {
            throw new UnauthorizedException(UNAUTH_MESSAGE);
        }

        const [scheme, token] = authHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            throw new UnauthorizedException(UNAUTH_MESSAGE);
        }

        // Verify token
        const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
        let payload: IJWTPayload;

        try {
            payload = this.jwtService.verify<IJWTPayload>(token, { secret });
        } catch (error) {
            throw new UnauthorizedException(UNAUTH_MESSAGE);
        }
        const foundUser = await this.userService.findOne(payload.id);
        if (!foundUser) throw new UnauthorizedException(UNAUTH_MESSAGE);

        if (!foundUser.isActive) throw new UnauthorizedException(UNAUTH_MESSAGE);

        (request as any).user = foundUser;

        return true;
    }
}
