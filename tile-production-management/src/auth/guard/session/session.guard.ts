import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { COOKIE_KEY, IJWTPayload } from 'src/auth/auth.constant';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class SessionGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly sessionService: SessionService,
        private readonly configService: ConfigService,
        private readonly userService: UsersService
    ) { }
    async canActivate(
        context: ExecutionContext,
    ): Promise<boolean> {
        const request: Request = context.switchToHttp().getRequest()
        const cookies = request.cookies
        const refreshToken = cookies[COOKIE_KEY.REFRESH_TOKEN_KEY]
        const sessionId = cookies[COOKIE_KEY.SESSION_ID_KEY]
        if (!refreshToken || !sessionId) throw new UnauthorizedException()

        const secret = this.configService.get<string>('JWT_REFRESH_SECRET')
        let payload: IJWTPayload;
        try {
            payload = this.jwtService.verify<IJWTPayload>(refreshToken, { secret });
        } catch (error) {
            throw new UnauthorizedException();
        }
        const session = await this.sessionService.verifyRefreshToken(sessionId, refreshToken)
        if (!session) {
            await this.sessionService.revokeSession(sessionId)
            throw new UnauthorizedException()
        }

        if (session.revoked) throw new UnauthorizedException()

        const foundUser = await this.userService.findOne(payload.id);
        if (!foundUser) throw new UnauthorizedException();
        if (!foundUser.isActive) throw new UnauthorizedException();

        (request as any).refreshToken = refreshToken;
        (request as any).user = foundUser;
        (request as any).sessionId = sessionId;
        return true;
    }
}
