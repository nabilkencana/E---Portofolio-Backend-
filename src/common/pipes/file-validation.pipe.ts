import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface FileValidationOptions {
    required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
    private options: FileValidationOptions;

    constructor(options?: FileValidationOptions) {
        this.options = { required: true, ...options };
    }

    transform(file: Express.Multer.File) {
        if (this.options.required && !file) {
            throw new BadRequestException('File is required');
        }

        if (file) {
            // Validasi tipe file
            const allowedMimeTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/webp',
            ];

            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new BadRequestException(
                    'Invalid file type. Allowed types: PDF, JPEG, PNG, WebP',
                );
            }

            // Validasi ukuran file (5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new BadRequestException('File size must be less than 5MB');
            }
        }

        return file;
    }
}