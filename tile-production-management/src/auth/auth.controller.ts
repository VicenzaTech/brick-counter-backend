import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDTO } from './dtos/login-dto';
import { AuthGuard } from './guard/auth/auth.guard';
import { SessionGuard } from './guard/session/session.guard';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms from 'ms'
import { COOKIE_KEY } from './auth.constant';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService
    ) { }

    @Post('/login')
    async login(@Body() loginDto: LoginDTO, @Res({ passthrough: true }) res: Response) {
        const expired = this.configService.get('JWT_REFRESH_EXPIRES')
        const expired_ms = Number((ms(expired)))
        const loginData = await this.authService.login(loginDto)
        res.cookie(COOKIE_KEY.REFRESH_TOKEN_KEY, loginData.tokens.refreshtoken, {
            httpOnly: true,
            secure: true,
            maxAge: expired_ms
        })
        res.cookie(COOKIE_KEY.SESSION_ID_KEY, loginData.sessionId, {
            httpOnly: true,
            secure: true,
            maxAge: expired_ms
        })
        return loginData
    }

    @Post('/logout')
    @UseGuards(SessionGuard)
    async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
        // 1. logout if received user request
        // 2. force logout if expired token
        const sessionId = req.sessionId
        const logoutData = await this.authService.logout(sessionId)
        res.clearCookie(COOKIE_KEY.REFRESH_TOKEN_KEY, {
            httpOnly: true,
        })
        res.clearCookie(COOKIE_KEY.SESSION_ID_KEY, {
            httpOnly: true,
        })
        return logoutData
    }

    @Post('/refresh')
    @UseGuards(SessionGuard)
    async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
        const user = req.user
        const sessionId = req.sessionId
        const refreshToken = req.refreshToken

        const expired = this.configService.get('JWT_REFRESH_EXPIRES')
        const refreshData = await this.authService.refresh(user, refreshToken, sessionId)
        const { tokens } = refreshData
        const expired_ms = Number((ms(expired)))
        res.cookie[COOKIE_KEY.REFRESH_TOKEN_KEY] = tokens.refreshtoken
       
        return refreshData
    }

    @Get('/me')
    @UseGuards(AuthGuard)
    async me(@Req() req) {
        const user = req.user
        return await this.authService.me(user)
    }
}
