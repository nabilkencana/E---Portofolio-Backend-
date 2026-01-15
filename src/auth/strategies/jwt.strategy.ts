import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        config: ConfigService,
        private prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET'),
            ignoreExpiration: false,

            // ⚠️ Jangan paksa audience & issuer dulu
            // Supabase token kadang beda environment
            // audience: config.get('SUPABASE_JWT_AUDIENCE'),
            // issuer: config.get('SUPABASE_JWT_ISSUER'),
        });
    }

    async validate(payload: any) {
        console.log('JWT Payload:', payload);

        const userId = payload.sub;

        if (!userId) {
            throw new UnauthorizedException('Invalid token: no user ID');
        }

        let user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // Jika user belum ada → buat otomatis
        if (!user) {
            console.log('User not found, creating from Supabase...');

            user = await this.prisma.user.create({
                data: {
                    id: userId,
                    email: payload.email || '',
                    name: payload.user_metadata?.name || '',
                    password: 'supabase-auth',
                    emailVerified: !!payload.email_confirmed_at,
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    emailVerified: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
        }

        return {
            ...user,
            supabaseMetadata: {
                app_metadata: payload.app_metadata,
                user_metadata: payload.user_metadata,
                role: payload.role,
                aud: payload.aud,
                iss: payload.iss,
            },
        };
    }
}
