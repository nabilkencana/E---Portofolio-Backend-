import { IsString, IsOptional, IsUrl, Length, Matches, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
    @ApiProperty({ description: 'Full name of the user', required: true })
    @IsString()
    @Length(2, 100)
    full_name: string;

    @ApiProperty({ description: 'Phone number', required: false })
    @IsOptional()
    @IsString()
    @Matches(/^(\+62|62|0)8[1-9][0-9]{6,9}$/, {
        message: 'Format nomor telepon Indonesia tidak valid',
    })
    phone?: string;

    @ApiProperty({ description: 'User biography', required: false })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    bio?: string;

    @ApiProperty({ description: 'Personal website URL', required: false })
    @IsOptional()
    @IsString()
    @IsUrl()
    website?: string;

    @ApiProperty({ description: 'Location/city', required: false })
    @IsOptional()
    @IsString()
    @Length(0, 100)
    location?: string;

    @ApiProperty({ description: 'Email address', required: false })
    @IsOptional()
    @IsEmail()
    email?: string;
}