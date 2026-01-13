import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    level?: string;
}
