import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getStats(userId: string) {
    // Count total achievements
    const totalAchievements = await this.prisma.achievement.count({
      where: { userId },
    });

    // Count validated achievements
    const validatedAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        status: 'APPROVED',
      },
    });

    // Count pending achievements
    const pendingAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    // Count rejected achievements
    const rejectedAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        status: 'REJECTED',
      },
    });

    // Calculate percentage
    const validationPercentage = totalAchievements > 0
      ? Math.round((validatedAchievements / totalAchievements) * 100)
      : 0;

    // Get recent additions this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const recentAdditions = await this.prisma.achievement.count({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    return {
      totalAchievements,
      validatedAchievements,
      pendingAchievements,
      rejectedAchievements,
      validationPercentage,
      recentAdditions,
    };
  }

  async getRecentAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        attachments: {
          take: 1,
        },
      },
    });

    return achievements.map(achievement => ({
      id: achievement.id,
      title: achievement.title,
      type: achievement.category?.name || 'Sertifikat',
      status: achievement.status,
      date: achievement.createdAt.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      description: achievement.description,
      hasAttachment: achievement.attachments.length > 0,
    }));
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

    // Get missing fields
    const missingFields: string[] = [];
    if (!user.profile.name) missingFields.push('Nama Lengkap');
    if (!user.profile.nip) missingFields.push('NIP');
    if (!user.profile.phone) missingFields.push('Nomor Telepon');
    if (!user.profile.schoolId) missingFields.push('Sekolah');
    if (!teacherDetail?.subjectTaught) missingFields.push('Mata Pelajaran');
    if (!teacherDetail?.competencies) missingFields.push('Kompetensi');
    if (!teacherDetail?.educationLevel) missingFields.push('Tingkat Pendidikan');
    if (!teacherDetail?.yearsOfExperience) missingFields.push('Pengalaman Mengajar');
    if (user.educations.length === 0) missingFields.push('Pendidikan');
    if (user.experiences.length === 0) missingFields.push('Pengalaman Kerja');
    if (user.skills.length === 0) missingFields.push('Keahlian');
    if (user.subjects.length === 0) missingFields.push('Mata Pelajaran yang Diajarkan');

    return {
      percentage: completionPercentage,
      completed: completionScore,
      total: totalFields,
      missingFields: missingFields.slice(0, 5),
    };
  }

  async getDashboardSummary(userId: string) {
    const [stats, recentAchievements, profileCompletion] = await Promise.all([
      this.getStats(userId),
      this.getRecentAchievements(userId),
      this.getProfileCompletion(userId),
    ]);

    return {
      stats,
      recentAchievements,
      profileCompletion,
    };
  }
}