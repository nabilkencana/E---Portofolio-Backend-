import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Tambah logging untuk debugging
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        console.log('=== JWT AUTH DEBUG ===');
        console.log('Request URL:', request.url);
        console.log('Auth Header:', authHeader);
        console.log('Request Headers:', JSON.stringify(request.headers, null, 2));

        if (!authHeader) {
            console.error('No authorization header found');
            throw new UnauthorizedException('No authorization header');
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        console.log('=== JWT AUTH RESULT ===');
        console.log('Error:', err);
        console.log('User:', user);
        console.log('Info:', info);
        console.log('Info name:', info?.name);
        console.log('Info message:', info?.message);

        if (err || !user) {
            console.error('JWT Auth failed:', {
                err,
                user,
                info
            });

            // Berikan pesan error yang lebih spesifik
            let errorMessage = 'Unauthorized';

            if (info instanceof Error) {
                errorMessage = info.message;
            } else if (info?.name === 'TokenExpiredError') {
                errorMessage = 'Token expired';
            } else if (info?.name === 'JsonWebTokenError') {
                errorMessage = 'Invalid token';
            }

            throw new UnauthorizedException(errorMessage);
        }

        console.log('JWT Auth successful for user:', user.id);
        return user;
    }
}