// src/auth/strategies/refresh-token.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
    Strategy,
    'jwt-refresh',
) {
    constructor(
        config: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.refresh_token;
                },
            ]),
            secretOrKey: config.get('JWT_REFRESH_SECRET'),
            passReqToCallback: true,
        });
    }

    async validate(req: Request, payload: any) {
        const refreshToken = req.cookies?.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token tidak ditemukan');
        }

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user || user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Refresh token tidak valid');
        }

        if (!user.refreshTokenExp || user.refreshTokenExp < new Date()) {
            throw new UnauthorizedException('Refresh token telah kadaluarsa');
        }

        return { ...user, refreshToken };
    }
}