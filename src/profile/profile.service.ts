import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTeacherDetailDto } from './dto/update-teacher-detail.dto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) { }

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

    return {
      ...userWithoutSensitive,
      teacherDetail: user.teacher_detail, // Rename for frontend compatibility
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

    // Create uploads directory if not exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const fileExt = path.extname(avatar.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, avatar.buffer);

    // Update profile with avatar URL
    const avatarUrl = `/uploads/avatars/${fileName}`;

    const existingProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

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
      message: 'Avatar uploaded successfully',
      avatarUrl,
    };
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