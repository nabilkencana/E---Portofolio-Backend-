export interface JwtPayload {
    sub: string; // user id
    email: string;
    role: string;
}

export interface JwtTokens {
    accessToken: string;
    refreshToken: string;
}