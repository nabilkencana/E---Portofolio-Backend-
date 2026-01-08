import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsNumber,
    Min,
    Max,
    IsInt,
    MaxLength,
    ValidateIf
} from 'class-validator';

export class CreateAchievementDto {
    @ApiProperty({
        description: 'Judul prestasi/sertifikat',
        example: 'Juara 1 Guru Berprestasi'
    })
    @IsString({ message: 'Title must be a string' })
    @MaxLength(200, { message: 'Title must be shorter than or equal to 200 characters' })
    title: string;

    @ApiProperty({
        description: 'Jenis: prestasi atau sertifikat',
        enum: ['prestasi', 'sertifikat'],
        example: 'prestasi'
    })
    @IsEnum(['prestasi', 'sertifikat'], { message: 'Type must be either "prestasi" or "sertifikat"' })
    type: 'prestasi' | 'sertifikat';

    @ApiProperty({
        description: 'Deskripsi',
        required: false,
        example: 'Meraih juara 1 dalam lomba guru berprestasi'
    })
    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    @MaxLength(1000, { message: 'Description must be shorter than or equal to 1000 characters' })
    description?: string;

    @ApiProperty({
        description: 'Tingkat prestasi',
        required: false,
        enum: ['sekolah', 'kecamatan', 'kabupaten', 'provinsi', 'nasional', 'internasional'],
        example: 'provinsi'
    })
    @IsOptional()
    @IsEnum(['sekolah', 'kecamatan', 'kabupaten', 'provinsi', 'nasional', 'internasional'], {
        message: 'Level must be one of: sekolah, kecamatan, kabupaten, provinsi, nasional, internasional'
    })
    level?: string;

    @ApiProperty({
        description: 'Tahun',
        required: false,
        example: 2024,
        type: Number
    })
    @IsOptional()
    @IsInt({ message: 'Year must be an integer' })
    @Min(1990, { message: 'Year must be at least 1990' })
    @Max(new Date().getFullYear(), { message: 'Year cannot be in the future' })
    @Type(() => Number) // ← PENTING: Transform string to number
    year?: number;
}