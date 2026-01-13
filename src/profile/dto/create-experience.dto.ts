import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateExperienceDto {
    @IsString()
    company: string;      // ❗ WAJIB

    @IsString()
    position: string;    // ❗ WAJIB

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    startDate: string;   // ❗ WAJIB (ISO Date)

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    isCurrent?: boolean;
}
