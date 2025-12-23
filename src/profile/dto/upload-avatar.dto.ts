import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File gambar (JPG, PNG, GIF, WebP) maksimal 5MB',
    })
    avatar: any;
}