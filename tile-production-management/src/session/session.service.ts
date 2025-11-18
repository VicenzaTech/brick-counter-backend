import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { HASH_PROVIDER, Hasher } from 'src/common/hash/hash.constant';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';
import { CreateSessionDTO } from './dto/create-session.dto';

// export interface ISession {
//     sessionId: string;
//     userId: string;
//     refreshTokenHash: string;
//     userAgent: string;
//     ip: string;
//     createdAt: Date;
//     lastActivityAt: Date;
//     expiresAt: Date;
//     revoked: string;
// }

@Injectable()
export class SessionService {
    constructor(
        @Inject(REDIS_PROVIDER) private readonly redis: Redis,
        @Inject(HASH_PROVIDER) private readonly hasher: Hasher,
    ) { }

    private sessionKey(sessionId: string) {
        return `session:${sessionId}`;
    }

    private userSessionsKey(userId: number | string) {
        return `user_sessions:${userId}`;
    }

    async createSession(input: CreateSessionDTO) {
        const sessionId = randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000);

        const refreshTokenHash = await this.hasher.hash(input.refreshToken);

        const data = {
            userId: input.userId,
            refreshTokenHash,
            userAgent: input.userAgent ?? '',
            ip: input.ip ?? '',
            createdAt: now.toISOString(),
            lastActivityAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            revoked: false,
        };

        const key = this.sessionKey(sessionId);
        await this.redis.set(key, JSON.stringify(data), 'EX', input.ttlSeconds);
        await this.redis.sadd(this.userSessionsKey(input.userId), sessionId);

        return { sessionId, ...data };
    }

    async getSession(sessionId: string) {
        const raw = await this.redis.get(this.sessionKey(sessionId));
        if (!raw) return null;
        return JSON.parse(raw);
    }

    async updateRefreshToken(sessionId: string, refreshToken: string) {
        if (!refreshToken || !sessionId) {
            throw new BadRequestException('Missing sessionId or refreshToken');
        }

        const sessionKey = this.sessionKey(sessionId);
        const session = await this.getSession(sessionId);

        if (!session) {
            throw new BadRequestException(`Session with ID ${sessionId} not found`);
        }

        const refreshTokenHash = await this.hasher.hash(refreshToken);
        session.refreshTokenHash = refreshTokenHash;
        session.lastActivityAt = new Date().toISOString();
        
        await this.redis.set(sessionKey, JSON.stringify(session), 'KEEPTTL');
        return session;
    }

    async verifyRefreshToken(sessionId: string, refreshToken: string) {
        const session = await this.getSession(sessionId);
        if (!session || session.revoked) return null;

        const ok = await this.hasher.compare(refreshToken, session.refreshTokenHash);
        if (!ok) return null;

        return session;
    }

    async touchSession(sessionId: string) {
        const key = this.sessionKey(sessionId);
        const raw = await this.redis.get(key);
        if (!raw) return;

        const session = JSON.parse(raw);
        session.lastActivityAt = new Date().toISOString();
        await this.redis.set(key, JSON.stringify(session), 'KEEPTTL');
    }

    async revokeSession(sessionId: string) {
        const session = await this.getSession(sessionId);
        if (!session) return;

        const key = this.sessionKey(sessionId);

        session.revoked = true;
        await this.redis.set(key, JSON.stringify(session), 'KEEPTTL');
        await this.redis.srem(this.userSessionsKey(session.userId), sessionId);
    }

    async revokeAllSessionsForUser(userId: number) {
        const key = this.userSessionsKey(userId);
        const sessionIds = await this.redis.smembers(key);

        if (sessionIds.length) {
            const pipeline = this.redis.pipeline();
            for (const sid of sessionIds) {
                pipeline.del(this.sessionKey(sid));
            }
            pipeline.del(key);
            await pipeline.exec();
        }
    }

    async listUserSessions(userId: number) {
        const sessionIds = await this.redis.smembers(this.userSessionsKey(userId));
        const pipeline = this.redis.pipeline();

        for (const sid of sessionIds) {
            pipeline.get(this.sessionKey(sid));
        }

        const result = await pipeline.exec() ?? [];
        return result
            .map(([, value], idx) => {
                if (!value) return null;
                return { id: sessionIds[idx], ...JSON.parse(value as string) };
            })
            .filter(Boolean);
    }
}
