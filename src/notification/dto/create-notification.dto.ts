// notifications/dto/create-notification.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUrl, IsDateString } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty()
    @IsString()
    title: string;

    @ApiProperty()
    @IsString()
    message: string;

    @ApiProperty({ enum: NotificationType })
    @IsEnum(NotificationType)
    @IsOptional()
    type?: NotificationType;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    relatedId?: string;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    relatedType?: string;

    @ApiProperty({ required: false })
    @IsUrl()
    @IsOptional()
    link?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    metadata?: any;

    @ApiProperty({ required: false })
    @IsDateString()
    @IsOptional()
    expiresAt?: Date; // Tambahkan ini
}