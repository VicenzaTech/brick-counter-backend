import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { IJWTPayload } from './auth.constant';
import { LoginDTO } from './dtos/login-dto';
import { UsersService } from 'src/users/users.service';
import { HASH_PROVIDER, Hasher } from 'src/common/hash/hash.constant';
import { CreateSessionDTO } from 'src/session/dto/create-session.dto';
import { SessionService } from 'src/session/session.service';
import ms from 'ms';

@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
        private readonly userService: UsersService,
        private readonly sessionService: SessionService,
        @Inject(HASH_PROVIDER) private readonly hasher: Hasher
    ) { }

    async me(user: User) {
        const { roles, permissions } = await this.userService.findUserRolesAndPermissions(user.id)
        return {
            user: {
                email: user?.email,
                username: user?.username,
                id: user?.id,
                roles,
                permissions
            }
        }
    }

    async login(loginDTO: LoginDTO) {
        const { identifier, password } = loginDTO
        const isEmail = identifier.includes('@')
        const expired = this.configService.get('JWT_REFRESH_EXPIRES')
        const expired_ms = Number(ms(expired))

        const lowerIndentifier = identifier.toLowerCase()
        const foundUser = await (isEmail
            ? this.userService.findOneByEmail(lowerIndentifier)
            : this.userService.findOneByUsername(lowerIndentifier))
        if (!foundUser) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ')
        }

        const isValidPassword = await this.hasher.compare(password, foundUser.passwordHash)
        if (!isValidPassword) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ')
        }

        const isActiveUser = foundUser.isActive
        if (!isActiveUser) {
            throw new ForbiddenException('Tài khoản hiện tại không truy cập được. Liên hệ Admin!')
        }

        const payload: IJWTPayload = {
            email: foundUser.email,
            username: foundUser.username,
            id: foundUser.id
        }

        // Generate tokens
        const tokens = await this.generateTokenPair(payload)

        // Generate Session
        const sessionPayload: CreateSessionDTO = {
            ip: '127.0.0.1',
            refreshToken: tokens.refreshtoken,
            ttlSeconds: expired_ms,
            userAgent: 'dev',
            userId: foundUser.id
        }

        const newSession = await this.sessionService.createSession(sessionPayload)
        if (!newSession) {
            throw new ForbiddenException('Có lỗi xảy ra')
        }

        const { roles, permissions } = await this.userService.findUserRolesAndPermissions(foundUser.id)

        return {
            tokens,
            user: {
                ...payload,
                roles,
                permissions
            },
            sessionId: newSession.sessionId
        }
    }

    async logout(sessionId: string) {
        // Remove Session
        await this.sessionService.revokeSession(sessionId)
        return {
            sessionId
        }
    }

    async refresh(user: User, refreshToken: string, sessionId: string) {
        // Check params
        if (!user || !refreshToken || !sessionId) {
            throw new UnauthorizedException()
        }

        // Generate new token
        const payload: IJWTPayload = {
            email: user.email,
            id: user.id,
            username: user.username
        }

        const tokens = await this.generateTokenPair(payload)
        const { roles, permissions } = await this.userService.findUserRolesAndPermissions(user.id)

        // Update to redis session
        const updatedSession = await this.sessionService.updateRefreshToken(sessionId, tokens.refreshtoken)
        if (!updatedSession) {
            throw new UnauthorizedException('Phiên đăng nhập đã hết hạn')
        }

        return {
            tokens,
            user: {
                ...payload,
                roles,
                permissions
            },
            sessionId: sessionId
        }
    }

    // Generate Accesstoken - RefreshToken For Client
    async generateTokenPair(payload: IJWTPayload) {
        const JWT_ACCESS_SECRET = this.configService.get<string>('JWT_ACCESS_SECRET')
        const JWT_ACCESS_EXPIRES = this.configService.get<string>('JWT_ACCESS_EXPIRES') as any
        const JWT_REFRESH_SECRET = this.configService.get<string>('JWT_REFRESH_SECRET')
        const JWT_REFRESH_EXPIRES = this.configService.get<string>('JWT_REFRESH_EXPIRES') as any

        const accessToken = await this.jwtService.sign(
            payload,
            {
                secret: JWT_ACCESS_SECRET,
                expiresIn: (JWT_ACCESS_EXPIRES ?? '15m')
            }
        )

        const refreshtoken = this.jwtService.sign(
            payload,
            {
                secret: JWT_REFRESH_SECRET,
                expiresIn: (JWT_REFRESH_EXPIRES ?? '15m')
            }
        )

        return { accessToken, refreshtoken }
    }
}

