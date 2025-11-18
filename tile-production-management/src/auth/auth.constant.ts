export interface IJWTPayload {
    username: string;
    email: string;
    id: string;
}

export const COOKIE_KEY = {
    REFRESH_TOKEN_KEY: 'x-refresh',
    SESSION_ID_KEY: 'x-session-id'
} 