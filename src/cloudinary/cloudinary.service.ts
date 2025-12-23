import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    async uploadImage(
        file: Express.Multer.File,
        folder = 'e-portofolio/avatars',
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill' },
                        { quality: 'auto:good' },
                    ],
                },
                (error: UploadApiErrorResponse, result: UploadApiResponse) => {
                    if (error) {
                        reject(new BadRequestException(`Upload failed: ${error.message}`));
                    } else {
                        resolve(result);
                    }
                },
            );

            uploadStream.end(file.buffer);
        });
    }

    async uploadImageFromBuffer(
        buffer: Buffer,
        options: {
            folder?: string;
            public_id?: string;
            transformation?: any[];
        } = {},
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'e-portofolio/avatars',
                    resource_type: 'image',
                    public_id: options.public_id,
                    transformation: options.transformation || [
                        { width: 400, height: 400, crop: 'fill' },
                        { quality: 'auto:good' },
                    ],
                },
                (error: UploadApiErrorResponse, result: UploadApiResponse) => {
                    if (error) {
                        reject(new BadRequestException(`Upload failed: ${error.message}`));
                    } else {
                        resolve(result);
                    }
                },
            );

            uploadStream.end(buffer);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Failed to delete image from Cloudinary:', error);
            // Don't throw error, just log it
        }
    }

    async getImageUrl(publicId: string, options: any = {}): Promise<string> {
        return cloudinary.url(publicId, {
            secure: true,
            ...options,
        });
    }

    async optimizeImage(url: string): Promise<string> {
        // Add Cloudinary transformations for optimization
        const transformations = [
            'c_fill',
            'w_400',
            'h_400',
            'q_auto:good',
            'f_auto',
        ].join(',');

        return url.replace('/upload/', `/upload/${transformations}/`);
    }
}