import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePreferencesDto {
    @ApiProperty({ description: 'Enable email notifications' })
    @IsBoolean()
    @IsOptional()
    emailNotifications?: boolean;

    @ApiProperty({ description: 'Enable push notifications' })
    @IsBoolean()
    @IsOptional()
    pushNotifications?: boolean;

    @ApiProperty({ description: 'Enable dark mode' })
    @IsBoolean()
    @IsOptional()
    darkMode?: boolean;

    @ApiProperty({ description: 'Subscribe to newsletter' })
    @IsBoolean()
    @IsOptional()
    newsletter?: boolean;

    @ApiProperty({ description: 'Receive marketing emails' })
    @IsBoolean()
    @IsOptional()
    marketingEmails?: boolean;

    @ApiProperty({ description: 'Enable two factor authentication' })
    @IsBoolean()
    @IsOptional()
    twoFactorAuth?: boolean;

    @ApiProperty({ description: 'Preferred language', enum: ['id', 'en', 'ja'] })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiProperty({
        description: 'Timezone',
        enum: ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']
    })
    @IsString()
    @IsOptional()
    timezone?: string;
}