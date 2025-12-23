import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTeacherDetailDto } from './dto/update-teacher-detail.dto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) { }

  async getCompleteProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            school: true,
          },
        },
        teacher_detail: true,
        educations: {
          orderBy: { startYear: 'desc' },
        },
        experiences: {
          orderBy: { startDate: 'desc' },
        },
        skills: {
          orderBy: { name: 'asc' },
        },
        subjects: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Transform response
    const { password, refreshToken, refreshTokenExp, ...userWithoutSensitive } = user;

    // Optimize avatar URL if exists
    let optimizedProfile = userWithoutSensitive.profile;
    if (optimizedProfile?.avatarUrl) {
      try {
        optimizedProfile.avatarUrl = await this.cloudinaryService.optimizeImage(
          optimizedProfile.avatarUrl,
        );
      } catch (error) {
        console.error('Failed to optimize image URL:', error);
      }
    }

    return {
      ...userWithoutSensitive,
      profile: optimizedProfile,
      teacherDetail: user.teacher_detail,
    };
  }

  async updateBasicProfile(userId: string, dto: UpdateProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user email if provided and different
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new BadRequestException('Email already exists');
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { email: dto.email },
      });
    }

    // Update or create profile
    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return await this.prisma.profile.update({
        where: { userId },
        data: {
          name: dto.name,
          nip: dto.nip,
          email: dto.email || user.email,
          phone: dto.phone,
          schoolId: dto.schoolId,
        },
        include: {
          school: true,
        },
      });
    } else {
      return await this.prisma.profile.create({
        data: {
          userId,
          name: dto.name,
          nip: dto.nip,
          email: dto.email || user.email,
          phone: dto.phone,
          schoolId: dto.schoolId,
        },
        include: {
          school: true,
        },
      });
    }
  }

  async updateTeacherDetails(userId: string, dto: UpdateTeacherDetailDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update or create teacher details
    const existingDetails = await this.prisma.teacherDetail.findUnique({
      where: { userId },
    });

    if (existingDetails) {
      return await this.prisma.teacherDetail.update({
        where: { userId },
        data: {
          subjectTaught: dto.subjectTaught,
          competencies: dto.competencies,
          educationLevel: dto.educationLevel,
          yearsOfExperience: dto.yearsOfExperience,
        },
      });
    } else {
      return await this.prisma.teacherDetail.create({
        data: {
          userId,
          subjectTaught: dto.subjectTaught,
          competencies: dto.competencies,
          educationLevel: dto.educationLevel,
          yearsOfExperience: dto.yearsOfExperience,
        },
      });
    }
  }

  async uploadAvatar(userId: string, avatar: Express.Multer.File) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate file
    if (!avatar.mimetype.startsWith('image/')) {
      throw new BadRequestException('File harus berupa gambar');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (avatar.size > maxSize) {
      throw new BadRequestException('Ukuran file maksimal 5MB');
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(avatar, 'e-portofolio/avatars');

      // Get existing profile to check for old avatar
      const existingProfile = await this.prisma.profile.findUnique({
        where: { userId },
      });

      // Delete old avatar from Cloudinary if exists
      if (existingProfile?.avatarUrl) {
        try {
          // Extract public_id from URL
          const urlParts = existingProfile.avatarUrl.split('/');
          const publicIdWithExtension = urlParts.slice(-2).join('/');
          const publicId = publicIdWithExtension.split('.')[0];

          await this.cloudinaryService.deleteImage(publicId);
        } catch (deleteError) {
          console.error('Failed to delete old avatar:', deleteError);
          // Continue anyway
        }
      }

      const avatarUrl = uploadResult.secure_url;

      if (existingProfile) {
        await this.prisma.profile.update({
          where: { userId },
          data: { avatarUrl },
        });
      } else {
        await this.prisma.profile.create({
          data: {
            userId,
            avatarUrl,
            email: user.email,
          },
        });
      }

      return {
        message: 'Avatar berhasil diupload',
        avatarUrl,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new BadRequestException('Gagal mengupload avatar: ' + error.message);
    }
  }

  async deleteAvatar(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!existingProfile?.avatarUrl) {
      throw new BadRequestException('User tidak memiliki avatar');
    }

    try {
      // Extract public_id from URL
      const urlParts = existingProfile.avatarUrl.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/');
      const publicId = publicIdWithExtension.split('.')[0];

      // Delete from Cloudinary
      await this.cloudinaryService.deleteImage(publicId);

      // Update database
      await this.prisma.profile.update({
        where: { userId },
        data: { avatarUrl: null },
      });

      return {
        message: 'Avatar berhasil dihapus',
      };
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      throw new BadRequestException('Gagal menghapus avatar');
    }
  }

  async getSchools() {
    return await this.prisma.school.findMany({
      orderBy: { schoolName: 'asc' },
      select: {
        id: true,
        schoolCode: true,
        schoolName: true,
        schoolType: true,
        city: true,
        province: true,
      },
    });
  }

  async getProfileCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        teacher_detail: true,
        educations: true,
        experiences: true,
        skills: true,
        subjects: true,
      },
    });

    if (!user || !user.profile) {
      return {
        percentage: 0,
        completed: 0,
        total: 10,
        missingFields: [],
      };
    }

    let completionScore = 0;
    const totalFields = 10; // Total fields to check

    // Basic info
    if (user.profile.name) completionScore++;
    if (user.profile.nip) completionScore++;
    if (user.profile.phone) completionScore++;
    if (user.profile.schoolId) completionScore++;

    // Teacher details
    const teacherDetail = user.teacher_detail;
    if (teacherDetail?.subjectTaught) completionScore++;
    if (teacherDetail?.competencies) completionScore++;
    if (teacherDetail?.educationLevel) completionScore++;
    if (teacherDetail?.yearsOfExperience) completionScore++;

    // Additional info
    if (user.educations.length > 0) completionScore++;
    if (user.experiences.length > 0) completionScore++;
    if (user.skills.length > 0) completionScore++;
    if (user.subjects.length > 0) completionScore++;

    const completionPercentage = Math.round((completionScore / totalFields) * 100);

    // Get missing fields (show top 5 most important)
    const missingFields: string[] = [];
    if (!user.profile.name) missingFields.push('Nama Lengkap');
    if (!user.profile.nip) missingFields.push('NIP');
    if (!user.profile.phone) missingFields.push('Nomor Telepon');
    if (!user.profile.schoolId) missingFields.push('Sekolah');
    if (!teacherDetail?.subjectTaught) missingFields.push('Mata Pelajaran');
    if (!teacherDetail?.competencies) missingFields.push('Kompetensi');
    if (!teacherDetail?.educationLevel) missingFields.push('Tingkat Pendidikan');
    if (!teacherDetail?.yearsOfExperience) missingFields.push('Pengalaman Mengajar');
    if (user.educations.length === 0) missingFields.push('Riwayat Pendidikan');
    if (user.experiences.length === 0) missingFields.push('Pengalaman Kerja');

    return {
      percentage: completionPercentage,
      completed: completionScore,
      total: totalFields,
      missingFields: missingFields.slice(0, 5),
    };
  }
}