// src/auth/dto/register.dto.ts
import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsNotEmpty
} from 'class-validator';

export class RegisterDto {
    @IsNotEmpty({ message: 'Nama wajib diisi' })
    @IsString({ message: 'Nama harus berupa string' })
    @MinLength(2, { message: 'Nama minimal 2 karakter' })
    @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
    name: string;

    @IsNotEmpty({ message: 'Email wajib diisi' })
    @IsEmail({}, { message: 'Format email tidak valid' })
    @MaxLength(100, { message: 'Email maksimal 100 karakter' })
    email: string;

    @IsNotEmpty({ message: 'Password wajib diisi' })
    @IsString({ message: 'Password harus berupa string' })
    @MinLength(6, { message: 'Password minimal 6 karakter' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        { message: 'Password harus mengandung huruf besar, huruf kecil, dan angka' }
    )
    password: string;

    @IsNotEmpty({ message: 'Konfirmasi password wajib diisi' })
    @IsString({ message: 'Konfirmasi password harus berupa string' })
    confirmPassword: string;
}