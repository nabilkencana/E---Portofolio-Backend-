import { IsString, IsOptional } from 'class-validator';

export class CreateSkillDto {
    @IsString()
    name: string;       // ❗ WAJIB

    @IsOptional()
    @IsString()
    level?: string;

    @IsOptional()
    @IsString()
    category?: string;
}
