// src/profile/dto/update-profile.dto.ts
import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({ description: 'Full name', required: false })
    @IsString()
    @IsOptional()
    @MinLength(2, { message: 'Nama minimal 2 karakter' })
    name?: string;

    @ApiProperty({ description: 'Teacher ID Number', required: false })
    @IsString()
    @IsOptional()
    @Matches(/^\d{18}$/, { message: 'NIP harus 18 digit' })
    nip?: string;

    @ApiProperty({ description: 'Email address', required: false })
    @IsEmail({}, { message: 'Format email tidak valid' })
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'Phone number', required: false })
    @IsString()
    @IsOptional()
    @Matches(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, {
        message: 'Format nomor telepon tidak valid',
    })
    phone?: string;

    @ApiProperty({ description: 'School ID', required: false })
    @IsString()
    @IsOptional()
    schoolId?: string;

    @ApiProperty({ description: 'Address', required: false })
    @IsString()
    @IsOptional()
    address?: string;
}