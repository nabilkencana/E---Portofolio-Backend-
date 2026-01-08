import { PartialType } from '@nestjs/swagger';
import { CreateAchievementDto } from './create-achievement.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAchievementDto extends PartialType(CreateAchievementDto) {
    @ApiProperty({
        description: 'Status validasi',
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVISION'],
        required: false
    })
    @IsOptional()
    @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'REVISION'])
    validationStatus?: string;

    @ApiProperty({
        description: 'Catatan penolakan/revisi',
        required: false
    })
    @IsOptional()
    @IsString()
    rejectionNotes?: string;
}