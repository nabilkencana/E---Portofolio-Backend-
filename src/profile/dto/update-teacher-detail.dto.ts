// src/profile/dto/update-teacher-detail.dto.ts
import { IsString, IsOptional, IsNumber, Min, Max, IsIn, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTeacherDetailDto {
    @ApiProperty({ description: 'Subject taught', required: false })
    @IsString()
    @IsOptional()
    @MinLength(2, { message: 'Mata pelajaran minimal 2 karakter' })
    subjectTaught?: string;

    @ApiProperty({ description: 'Teacher competencies', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(500, { message: 'Kompetensi maksimal 500 karakter' })
    competencies?: string;

    @ApiProperty({ description: 'Education level', required: false })
    @IsString()
    @IsOptional()
    @IsIn(['D3', 'S1', 'S2', 'S3'], { message: 'Tingkat pendidikan tidak valid' })
    educationLevel?: string;

    @ApiProperty({ description: 'Years of experience', required: false })
    @IsNumber()
    @IsOptional()
    @Min(0, { message: 'Pengalaman tidak boleh negatif' })
    @Max(50, { message: 'Pengalaman maksimal 50 tahun' })
    yearsOfExperience?: number;
}