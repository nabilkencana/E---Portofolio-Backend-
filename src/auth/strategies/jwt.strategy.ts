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
            // Supabase JWT khusus - perlu verifikasi audience
            audience: config.get('SUPABASE_JWT_AUDIENCE'),
            issuer: config.get('SUPABASE_JWT_ISSUER'),
        });
    }

    async validate(payload: any) {
        console.log('JWT Payload from Supabase:', payload);

        // Supabase payload format:
        // {
        //   "sub": "user-uuid",
        //   "email": "user@example.com",
        //   "phone": "",
        //   "app_metadata": { provider: "email", providers: ["email"] },
        //   "user_metadata": {},
        //   "role": "authenticated",
        //   "aud": "authenticated",
        //   "exp": 1234567890,
        //   "iss": "https://your-project.supabase.co/auth/v1"
        // }

        const userId = payload.sub;

        if (!userId) {
            throw new UnauthorizedException('Invalid token: no user ID');
        }

        // Cek user di database lokal
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

        // Jika user belum ada di database, buat entry baru
        if (!user) {
            console.log('User not found in database, creating new user...');
            user = await this.prisma.user.create({
                data: {
                    id: userId,
                    email: payload.email || '',
                    name: payload.user_metadata?.name || '',
                    password: 'supabase-auth', // Password dummy untuk Supabase auth
                    emailVerified: payload.email_confirmed_at ? true : false,
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

        // Tambahkan metadata dari Supabase
        return {
            ...user,
            supabaseMetadata: {
                app_metadata: payload.app_metadata,
                user_metadata: payload.user_metadata,
                role: payload.role,
                aud: payload.aud,
                iss: payload.iss,
            }
        };
    }
}