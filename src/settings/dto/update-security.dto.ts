import { IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSecurityDto {
    @ApiProperty({ description: 'Current password' })
    @IsString()
    @IsOptional()
    currentPassword?: string;

    @ApiProperty({ description: 'New password (min 6 characters)' })
    @IsString()
    @MinLength(6, { message: 'Password minimal 6 karakter' })
    newPassword: string;

    @ApiProperty({ description: 'Confirm new password' })
    @IsString()
    confirmPassword: string;
}