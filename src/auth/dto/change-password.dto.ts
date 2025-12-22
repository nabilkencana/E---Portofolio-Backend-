// src/auth/dto/change-password.dto.ts
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @MinLength(6, { message: 'Password saat ini minimal 6 karakter' })
    currentPassword: string;

    @IsString()
    @MinLength(6, { message: 'Password baru minimal 6 karakter' })
    newPassword: string;

    @IsString()
    confirmPassword: string;
}