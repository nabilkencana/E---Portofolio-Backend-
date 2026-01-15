import { ApiProperty } from '@nestjs/swagger';

export class AvatarUploadDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Image file (JPG, PNG, WebP) max 2MB',
    })
    avatar: any;
}