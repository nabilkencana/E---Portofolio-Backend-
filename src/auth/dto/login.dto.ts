// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @IsNotEmpty({ message: 'Email wajib diisi' })
    @IsEmail({}, { message: 'Format email tidak valid' })
    email: string;

    @IsNotEmpty({ message: 'Password wajib diisi' })
    @IsString({ message: 'Password harus berupa string' })
    @MinLength(6, { message: 'Password minimal 6 karakter' })
    password: string;
}