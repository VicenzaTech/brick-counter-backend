import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dtos/login-dto';
import { AuthGuard } from './guard/auth/auth.guard';
import { SessionGuard } from './guard/session/session.guard';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms from 'ms'
import { COOKIE_KEY } from './auth.constant';
import { ActivityAction, ActivityEntityType } from 'src/activity-log/entities/activity-log.enum';
import { LoggedResponse } from 'src/common/type/log.response';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    @Post('/login')
    async login(
        @Body() loginDto: LoginDTO,
        @Res({ passthrough: true }) res: Response,
        @Req() req,
    ): Promise<LoggedResponse<any>> {
        const expired = this.configService.get('JWT_REFRESH_EXPIRES')
        const expired_ms = Number((ms(expired)))
        const loginData = await this.authService.login(loginDto)
        // set user on request so interceptor can capture userId
        req.user = loginData.user
        res.cookie(COOKIE_KEY.REFRESH_TOKEN_KEY, loginData.tokens.refreshtoken, {
            httpOnly: true,
            secure: true,
            maxAge: expired_ms,
        })
        res.cookie(COOKIE_KEY.SESSION_ID_KEY, loginData.sessionId, {
            httpOnly: true,
            secure: true,
            maxAge: expired_ms,
        })
        return {
            data: loginData,
            log: {
                action: 'LOGIN_SUCCESS' as ActivityAction,
                actionType: 'LOGIN_SUCCESS' as ActivityAction,
                entityType: ActivityEntityType.User,
                description: `Người dùng ${loginData.user.username} đã đăng nhập`,
                entityId: undefined,
                entityName: loginData.user.username,
            },
        }
    }

    @Post('/logout')
    @UseGuards(SessionGuard)
    async logout(@Req() req, @Res({ passthrough: true }) res: Response, @Body() body): Promise<LoggedResponse<any>> {
        // 1. logout if received user request
        // 2. force logout if expired token
        const force = body?.force || false
        const sessionId = req.sessionId
        const user = req.user

        if (!force && !sessionId) {
            throw new Error('Session ID is required for logout')
        }
        let logoutData;
        if (sessionId) {
            logoutData = await this.authService.logout(sessionId)
        }
        res.clearCookie(COOKIE_KEY.REFRESH_TOKEN_KEY, {
            httpOnly: true,
        })
        res.clearCookie(COOKIE_KEY.SESSION_ID_KEY, {
            httpOnly: true,
        })
        return {
            data: logoutData,
            log: {
                action: 'LOGOUT' as ActivityAction,
                actionType: 'LOGOUT' as ActivityAction,
                entityType: ActivityEntityType.User,
                description: `Người dùng đã đăng xuất`,
                entityId: undefined,
                entityName: user?.username,
            },
        }
    }

    @Post('/logout/force')
    async forceLogout(@Body() body: any, @Res({ passthrough: true }) res: Response): Promise<LoggedResponse<any>> {
        res.clearCookie(COOKIE_KEY.REFRESH_TOKEN_KEY, { httpOnly: true });
        res.clearCookie(COOKIE_KEY.SESSION_ID_KEY, { httpOnly: true });

        return {
            data: "ok",
        }
    }

    @Post('/refresh')
    @UseGuards(SessionGuard)
    async refresh(@Req() req, @Res({ passthrough: true }) res: Response): Promise<LoggedResponse<any>> {
        const user = req.user
        const sessionId = req.sessionId
        const refreshToken = req.refreshToken

        const expired = this.configService.get('JWT_REFRESH_EXPIRES')
        const refreshData = await this.authService.refresh(user, refreshToken, sessionId)
        const { tokens } = refreshData
        const expired_ms = Number((ms(expired)))
        res.cookie[COOKIE_KEY.REFRESH_TOKEN_KEY] = tokens.refreshtoken
        return {
            data: refreshData,
        }
    }

    @Get('/me')
    @UseGuards(AuthGuard)
    async me(@Req() req): Promise<LoggedResponse<any>> {
        const user = req.user
        const meData = await this.authService.me(user)

        return {
            data: meData,
        }
    }
}
