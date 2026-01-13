import { IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateEducationDto {
    @IsString()
    institution: string;   // ❗ WAJIB

    @IsString()
    degree: string;        // ❗ WAJIB

    @IsOptional()
    @IsString()
    field?: string;

    @IsInt()
    @Min(1900)
    startYear: number;     // ❗ WAJIB

    @IsOptional()
    @IsInt()
    endYear?: number;

    @IsOptional()
    isCurrent?: boolean;
}
