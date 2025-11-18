export class CreateSessionDTO {
    userId: string;
    userAgent: string;
    ip: string;
    ttlSeconds: number;
    refreshToken: string;
}