import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    // Upload untuk avatar/profile (khusus gambar)
    async uploadAvatar(
        file: Express.Multer.File,
        folder = 'e-portofolio/avatars',
    ): Promise<UploadApiResponse> {
        return this.uploadFile(file, {
            folder,
            resource_type: 'image',
            transformation: [
                { width: 400, height: 400, crop: 'fill' },
                { quality: 'auto:good' },
            ],
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        });
    }

    // Upload untuk file achievement (support PDF & gambar)
    async uploadAchievementFile(
        file: Express.Multer.File,
        userId: string,
    ): Promise<UploadApiResponse> {
        // Tentukan resource type berdasarkan mime type
        const isImage = file.mimetype.startsWith('image/');
        const resourceType = isImage ? 'image' : 'raw'; // raw untuk PDF dan dokumen lain

        return this.uploadFile(file, {
            folder: `e-portofolio/achievements/${userId}`,
            resource_type: resourceType,
            allowed_formats: isImage
                ? ['jpg', 'jpeg', 'png', 'webp']
                : ['pdf'],
            // Untuk PDF, tidak ada transformation
            transformation: isImage
                ? [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ]
                : undefined,
        });
    }

    // Generic upload method
    async uploadFile(
        file: Express.Multer.File,
        options: {
            folder?: string;
            resource_type?: 'image' | 'video' | 'raw' | 'auto';
            transformation?: any[];
            allowed_formats?: string[];
            max_bytes?: number;
            public_id?: string;
        } = {},
    ): Promise<UploadApiResponse> {
        // Validasi ukuran file (default 5MB)
        const maxSize = options.max_bytes || 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new BadRequestException(
                `File size exceeds limit: ${maxSize / 1024 / 1024}MB`,
            );
        }

        // Validasi format file
        if (options.allowed_formats && options.allowed_formats.length > 0) {
            const fileExt = file.originalname.split('.').pop()?.toLowerCase();
            const mimeType = file.mimetype.split('/')[1];

            if (!options.allowed_formats.includes(mimeType) &&
                !(fileExt && options.allowed_formats.includes(fileExt))) {
                throw new BadRequestException(
                    `File format not allowed. Allowed: ${options.allowed_formats.join(', ')}`,
                );
            }
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'e-portofolio/uploads',
                    resource_type: options.resource_type || 'auto',
                    transformation: options.transformation,
                    allowed_formats: options.allowed_formats,
                    public_id: options.public_id,
                    // Untuk raw files (PDF), kita perlu format dan flags khusus
                    ...(options.resource_type === 'raw' && {
                        format: 'pdf',
                        flags: 'attachment', // Untuk memastikan PDF bisa didownload
                    }),
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

    // Upload dari buffer (untuk gambar dari URL atau buffer)
    async uploadImageFromBuffer(
        buffer: Buffer,
        options: {
            folder?: string;
            public_id?: string;
            transformation?: any[];
            resource_type?: 'image' | 'raw';
        } = {},
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: options.folder || 'e-portofolio/avatars',
                    resource_type: options.resource_type || 'image',
                    public_id: options.public_id,
                    transformation: options.transformation || [
                        { width: 400, height: 400, crop: 'fill' },
                        { quality: 'auto:good' },
                    ],
                    ...(options.resource_type === 'raw' && {
                        format: 'pdf',
                        flags: 'attachment',
                    }),
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

    // Hapus file dari Cloudinary
    async deleteFile(publicId: string, resource_type: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId, {
                resource_type: resource_type,
            });
        } catch (error) {
            console.error('Failed to delete file from Cloudinary:', error);
            // Throw error jika perlu
            throw new BadRequestException(`Failed to delete file: ${error.message}`);
        }
    }

    // Generate URL untuk file
    async getFileUrl(
        publicId: string,
        options: {
            resource_type?: 'image' | 'video' | 'raw';
            transformation?: any[];
            secure?: boolean;
            flags?: string;
        } = {},
    ): Promise<string> {
        const url = cloudinary.url(publicId, {
            secure: options.secure !== false,
            resource_type: options.resource_type || 'image',
            transformation: options.transformation,
            flags: options.flags,
            // Untuk PDF, tambahkan flag attachment untuk force download
            ...(options.resource_type === 'raw' && {
                flags: 'attachment',
            }),
        });

        return url;
    }

    // Generate signed URL untuk download (expirable)
    async generateSignedUrl(
        publicId: string,
        expiresIn: number = 3600, // 1 jam default
        options: {
            resource_type?: 'image' | 'video' | 'raw';
            attachment?: boolean;
            filename?: string;
        } = {},
    ): Promise<string> {
        // Untuk private download, kita perlu menggunakan private_download_url
        // Namun Cloudinary tidak support signed URL untuk semua resource type

        // Alternatif: Generate URL dengan expiry timestamp
        const timestamp = Math.round((Date.now() / 1000) + expiresIn);

        // Untuk raw files (PDF), kita bisa gunakan private download
        if (options.resource_type === 'raw') {
            const url = cloudinary.utils.private_download_url(
                publicId,
                options.filename || 'document',
                {
                    resource_type: 'raw',
                    expires_at: timestamp,
                },
            );
            return url;
        }

        // Untuk image, generate URL biasa dengan transformation jika perlu
        return cloudinary.url(publicId, {
            secure: true,
            resource_type: options.resource_type || 'image',
            sign_url: true,
            expires_at: timestamp,
            ...(options.attachment && { flags: 'attachment' }),
        });
    }

    // Optimize image URL
    async optimizeImage(url: string, transformations?: string): Promise<string> {
        if (!transformations) {
            transformations = [
                'c_fill',
                'w_400',
                'h_400',
                'q_auto:good',
                'f_auto',
            ].join(',');
        }

        // Replace upload path dengan transformations
        if (url.includes('/upload/') && !url.includes('/upload/')) {
            return url.replace('/upload/', `/upload/${transformations}/`);
        }

        return url;
    }

    // Validasi file sebelum upload
    validateFile(
        file: Express.Multer.File,
        allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        maxSize: number = 5 * 1024 * 1024,
    ): void {
        // Validasi mime type
        if (!allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
            );
        }

        // Validasi ukuran
        if (file.size > maxSize) {
            throw new BadRequestException(
                `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
            );
        }

        // Validasi ekstensi file
        const allowedExtensions = allowedTypes
            .map(type => {
                if (type === 'application/pdf') return 'pdf';
                return type.split('/')[1];
            })
            .filter(ext => ext);

        const fileExt = file.originalname.split('.').pop()?.toLowerCase();
        if (fileExt && !allowedExtensions.includes(fileExt)) {
            throw new BadRequestException(
                `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`,
            );
        }
    }

    // Cek resource type berdasarkan mime type
    getResourceType(mimeType: string): 'image' | 'raw' | 'video' {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType === 'application/pdf') return 'raw';
        return 'raw'; // default untuk dokumen lain
    }
}