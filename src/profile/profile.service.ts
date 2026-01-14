import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTeacherDetailDto } from './dto/update-teacher-detail.dto';
import { SchoolService } from 'src/school/school.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
    private schoolService: SchoolService
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
          nip: dto.nip ?? null,
          email: dto.email || user.email,
          phone: dto.phone,
          schoolId: dto.schoolId,
          address: dto.address || null,
        },
        include: {
          school: true,
        },
      });
    } else {
      return await this.prisma.profile.create({
        data: {
          userId,
          name: dto.name ?? null,
          nip: dto.nip ? String(dto.nip) : null,
          email: dto.email || user.email,
          phone: dto.phone ?? null,
          schoolId: dto.schoolId ?? null,
          address: dto.address ?? null,
        },
        include: { school: true },
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
          subjectTaught: dto.subjectTaught ?? existingDetails.subjectTaught,
          competencies: dto.competencies ?? existingDetails.competencies,
          educationLevel: dto.educationLevel ?? existingDetails.educationLevel,
          yearsOfExperience: dto.yearsOfExperience ?? existingDetails.yearsOfExperience,
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
      const uploadResult = await this.cloudinaryService.uploadAvatar(avatar, 'e-portofolio/avatars');

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

          await this.cloudinaryService.deleteFile(publicId);
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
      await this.cloudinaryService.deleteFile(publicId);

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

  async getSchools(query?: {
    province?: string;
    city?: string;
    schoolType?: string;
    search?: string;
  }) {
    const { data } = await this.schoolService.getSchools({
      ...query,
      limit: 100, // Limit untuk dropdown
    });

    return data;
  }

  async getProfileCompletion(userId: string) {
    console.log('=== FIXED PROFILE COMPLETION START ===');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        teacher_detail: true,
        educations: true,
        experiences: true,
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

    // FIX: HANYA 10 FIELD WAJIB - HAPUS SALAH SATU
    // Pilihan: hapus 'address' karena opsional
    const mandatoryChecks = {
      // Profile fields (4 - tanpa address)
      name: !!user.profile?.name?.trim(),
      nip: !!user.profile?.nip?.trim(),
      phone: !!user.profile?.phone?.trim(),
      school: !!user.profile?.schoolId,
      // address: !!user.profile?.address?.trim(), // HAPUS - OPSIONAL

      // Teacher detail fields (4)
      subjectTaught: (user.subjects?.length > 0) || !!user.teacher_detail?.subjectTaught?.trim(),
      competencies: !!user.teacher_detail?.competencies?.trim(),
      educationLevel: !!user.teacher_detail?.educationLevel?.trim(),
      experienceYears: user.teacher_detail?.yearsOfExperience != null,

      // Education & Experience (2)
      education: user.educations?.length > 0,
      experience: user.experiences?.length > 0,
    };

    console.log('FIXED - Mandatory Checks (10 fields):', mandatoryChecks);
    console.log('FIXED - Field counts:', {
      totalFields: Object.keys(mandatoryChecks).length,
      completedFields: Object.values(mandatoryChecks).filter(Boolean).length
    });

    const completedCount = Object.values(mandatoryChecks).filter(Boolean).length;
    const totalFields = Object.keys(mandatoryChecks).length; // Ini akan 10

    const percentage = Math.round((completedCount / totalFields) * 100);

    // FIX: Missing fields berdasarkan 10 field
    const missingFields: string[] = [];

    if (!mandatoryChecks.name) missingFields.push('Nama Lengkap');
    if (!mandatoryChecks.nip) missingFields.push('NIP');
    if (!mandatoryChecks.phone) missingFields.push('Nomor Telepon');
    if (!mandatoryChecks.school) missingFields.push('Sekolah');
    // if (!mandatoryChecks.address) missingFields.push('Alamat'); // HAPUS
    if (!mandatoryChecks.subjectTaught) missingFields.push('Mata Pelajaran yang Diajarkan');
    if (!mandatoryChecks.competencies) missingFields.push('Kompetensi');
    if (!mandatoryChecks.educationLevel) missingFields.push('Tingkat Pendidikan');
    if (!mandatoryChecks.experienceYears) missingFields.push('Pengalaman Mengajar');
    if (!mandatoryChecks.education) missingFields.push('Riwayat Pendidikan');
    if (!mandatoryChecks.experience) missingFields.push('Pengalaman Kerja');

    console.log('FIXED - Final Result:', {
      percentage,
      completed: completedCount,
      total: totalFields,
      missingFields
    });
    console.log('=== FIXED PROFILE COMPLETION END ===\n');

    return {
      percentage,
      completed: completedCount,
      total: totalFields,
      missingFields,
    };
  }

  async addEducation(userId: string, dto: CreateEducationDto) {
    const existing = await this.prisma.education.findFirst({
      where : {
        userId,
        institution: dto.institution.trim(),
        degree : dto.degree.trim(),
        startYear: dto.startYear,
        endYear : dto.endYear ?? null,
        isCurrent: dto.isCurrent ?? false,
        field : dto.field ?? null,
      }
    })
    if (!dto.institution || !dto.degree || !dto.startYear) {
      throw new BadRequestException('Data pendidikan belum lengkap');
    }

    if (existing) {
      throw new BadRequestException('Data pendidikan sudah ada')
    }

    return this.prisma.education.create({
      data: {
        userId,
        institution: dto.institution.trim(),
        degree: dto.degree.trim(),
        field: dto.field ?? null,
        startYear: dto.startYear,
        endYear: dto.endYear ?? null,
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }


  async addExperience(userId: string, dto: CreateExperienceDto) {
    const existing = await this.prisma.experience.findFirst({
      where : {
        userId,
        company: dto.company.trim(),
        position: dto.position.trim(),
        description: dto.description ?? null, 
        startDate: new Date(dto.startDate),
        endDate : dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent ?? false
      }
    })
    const start = new Date(dto.startDate);

    if (isNaN(start.getTime())) {
      throw new BadRequestException('Tanggal mulai tidak valid');
    }

    const end = dto.endDate ? new Date(dto.endDate) : null;
    
    if (existing) {
      throw new BadRequestException('Data pengalamn kerja sudah ada')
    }

    return this.prisma.experience.create({
      data: {
        userId,
        company: dto.company.trim(),
        position: dto.position.trim(),
        description: dto.description ?? null,
        startDate: start,
        endDate: end,
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }
  
  getExperiences(userId: string) {
    return this.prisma.experience.findMany({ where: { userId } });
  }

  async addSkill(userId: string, dto: CreateSkillDto) {
    const existing = await this.prisma.skill.findFirst({
      where : {
        userId,
        name : dto.name.trim(),
        level: dto.level ?? 'INTERMEDIATE', 
        category: dto.category ?? null,
      }
    })

    if (!dto.name?.trim()) {
      throw new BadRequestException('Nama skill wajib diisi');
    }

    if ( existing) {
      throw new BadRequestException('Skill sudah ada');
    }

    return this.prisma.skill.create({
      data: {
        userId,
        name: dto.name.trim(),
        level: dto.level ?? 'INTERMEDIATE',
        category: dto.category ?? null,
      },
    });
  }

  getSkills(userId: string) {
    return this.prisma.skill.findMany({ where: { userId } });
  }

  getSubjects(userId: string) {
    return this.prisma.subject.findMany({ where: { userId } });
  }

  async syncSubjectTaught(userId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (subjects.length > 0) {
      const subjectNames = subjects.map(s => s.name).join(', ');

      await this.prisma.teacherDetail.upsert({
        where: { userId },
        update: { subjectTaught: subjectNames },
        create: {
          userId,
          subjectTaught: subjectNames,
        },
      });
    }
  }

  // Di addSubject method, tambahkan:
  async addSubject(userId: string, dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where : {
        userId,
        name : dto.name.trim(),
        level : dto.level ?? null,
      }
    })

    if (existing) {
      throw new BadRequestException('Mata pelajaran sudah ada')
    }

    const subject = await this.prisma.subject.create({
      data: {
        userId,
        name: dto.name,
        level: dto.level ?? null,
      },
    });

    // Sync ke teacher_detail
    await this.syncSubjectTaught(userId);

    return subject;
  }
}