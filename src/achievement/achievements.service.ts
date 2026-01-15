import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Achievement, Status } from '@prisma/client';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(
    userId: string,
    createAchievementDto: CreateAchievementDto,
    file?: Express.Multer.File,
  ) {
    // Inisialisasi fileData dengan object kosong
    let fileData: any = {};

    // Upload file ke Cloudinary jika ada
    if (file) {
      // Validasi file sebelum upload
      this.cloudinaryService.validateFile(file);

      // Upload file achievement
      const uploadResult = await this.cloudinaryService.uploadAchievementFile(
        file,
        userId,
      );

      // Tentukan resource type untuk disimpan
      const resourceType = this.cloudinaryService.getResourceType(file.mimetype);

      fileData = {
        proofFilePath: uploadResult.secure_url,
        proofPublicId: uploadResult.public_id,
        fileSize: uploadResult.bytes,
        fileType: file.mimetype,
        originalFileName: file.originalname,
        resourceType,
      };
    }

    // Create achievement
    const achievement = await this.prisma.achievement.create({
      data: {
        userId,
        title: createAchievementDto.title,
        type: createAchievementDto.type,
        description: createAchievementDto.description || null,
        level: createAchievementDto.level || null,
        year: createAchievementDto.year || null,
        validationStatus: 'PENDING', // Default status
        ...fileData, // Spread hanya jika ada data
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return achievement;
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.validationStatus = status;
    }

    this.logger.log(`Fetching achievements for user ${userId}, type: ${type}, status: ${status}`);

    const [achievements, total] = await Promise.all([
      this.prisma.achievement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.achievement.count({ where }),
    ]);

    return {
      data: achievements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async search(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    this.logger.log(`Searching achievements for user ${userId}, query: "${query}"`);

    // Build search conditions
    const where: any = {
      userId,
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
        {
          description: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
        {
          type: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
        {
          level: {
            contains: query,
            mode: 'insensitive' as any,
          },
        },
        {
          year: {
            equals: isNaN(Number(query)) ? undefined : Number(query),
          },
        },
      ],
    };

    // Filter out undefined conditions
    const conditions = where.OR.filter((condition: any) => {
      if (condition.year && condition.year.equals === undefined) {
        return false;
      }
      return true;
    });

    where.OR = conditions.length > 0 ? conditions : undefined;

    const [achievements, total] = await Promise.all([
      this.prisma.achievement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.achievement.count({ where }),
    ]);

    return {
      data: achievements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query,
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Achievement> {
    this.logger.log(`Finding achievement ${id} for user ${userId}`);

    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          Category: true,
        },
      });

      if (!achievement) {
        this.logger.warn(`Achievement ${id} not found`);
        throw new NotFoundException('Achievement not found');
      }

      // Check ownership (kecuali admin)
      if (achievement.userId !== userId) {
        this.logger.warn(`User ${userId} tried to access achievement ${id} owned by ${achievement.userId}`);
        throw new ForbiddenException('You do not have permission to access this achievement');
      }

      this.logger.log(`Achievement ${id} found and accessible for user ${userId}`);
      return achievement;
    } catch (error) {
      this.logger.error(`Error finding achievement ${id}:`, error);
      throw error;
    }
  }

  async update(
    id: string,
    userId: string,
    updateAchievementDto: UpdateAchievementDto,
    file?: Express.Multer.File,
  ) {
    // Check if achievement exists and belongs to user
    const existing = await this.prisma.achievement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Achievement not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this achievement');
    }

    // Inisialisasi updateData
    const updateData: any = {
      title: updateAchievementDto.title,
      type: updateAchievementDto.type,
      description: updateAchievementDto.description || null,
      level: updateAchievementDto.level || null,
      year: updateAchievementDto.year || null,
      validationStatus: updateAchievementDto.validationStatus || existing.validationStatus,
      rejectionNotes: updateAchievementDto.rejectionNotes || null,
    };

    // Jika ada file baru, upload dan hapus file lama jika ada
    if (file) {
      // Validasi file baru
      this.cloudinaryService.validateFile(file);

      // Hapus file lama dari Cloudinary
      if (existing.proofPublicId) {
        const resourceType = existing.resourceType ||
          (existing.fileType?.includes('pdf') ? 'raw' : 'image');

        await this.cloudinaryService.deleteFile(
          existing.proofPublicId,
          resourceType as any,
        );
      }

      // Upload file baru
      const uploadResult = await this.cloudinaryService.uploadAchievementFile(
        file,
        userId,
      );

      const resourceType = this.cloudinaryService.getResourceType(file.mimetype);

      // Tambahkan file data ke updateData
      updateData.proofFilePath = uploadResult.secure_url;
      updateData.proofPublicId = uploadResult.public_id;
      updateData.fileSize = uploadResult.bytes;
      updateData.fileType = file.mimetype;
      updateData.originalFileName = file.originalname;
      updateData.resourceType = resourceType;
    }

    // Update achievement
    const updated = await this.prisma.achievement.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    // Check if achievement exists and belongs to user
    const existing = await this.prisma.achievement.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Achievement not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this achievement');
    }

    // Hapus file dari Cloudinary jika ada
    if (existing.proofPublicId) {
      // Gunakan resource type yang disimpan atau deteksi dari fileType
      const resourceType = existing.resourceType ||
        (existing.fileType?.includes('pdf') ? 'raw' : 'image');

      await this.cloudinaryService.deleteFile(
        existing.proofPublicId,
        resourceType as any,
      );
    }

    // Hapus dari database
    await this.prisma.achievement.delete({
      where: { id },
    });

    return { message: 'Achievement deleted successfully' };
  }

  async getSignedUrl(id: string, userId: string) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
    });

    if (!achievement) {
      throw new NotFoundException('Achievement not found');
    }

    if (achievement.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this file');
    }

    if (!achievement.proofPublicId) {
      throw new NotFoundException('File not found');
    }

    // Tentukan resource type
    const resourceType = achievement.resourceType ||
      (achievement.fileType?.includes('pdf') ? 'raw' : 'image');

    // Generate signed URL untuk download (valid 1 jam)
    const signedUrl = await this.cloudinaryService.generateSignedUrl(
      achievement.proofPublicId,
      3600, // 1 jam
      {
        resource_type: resourceType as any,
        attachment: true,
        filename: achievement.originalFileName || 'document',
      },
    );

    return {
      signedUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 jam dari sekarang
      fileName: achievement.originalFileName || 'document',
      fileType: achievement.fileType,
    };
  }
}