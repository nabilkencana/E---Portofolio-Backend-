// src/dashboard/dashboard.service.ts
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
        category: {
          select: {
            name: true,
          },
        },
        attachments: {
          take: 1,
          select: {
            id: true,
          },
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
    // Get user with all related data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    // Get counts separately to avoid complex includes
    const [experiences, skills, subjects] = await Promise.all([
      this.prisma.experience.count({
        where: { userId },
      }),
      this.prisma.skill.count({
        where: { userId },
      }),
      this.prisma.subject.count({
        where: { userId },
      }),
    ]);

    if (!user) return { percentage: 0, completed: 0, total: 8, missingFields: [] };

    let completionScore = 0;
    const totalFields = 8; // Total fields to check

    // Check each field
    if (user.name && user.name.trim().length > 0) completionScore++;
    if (user.profile?.phone) completionScore++;
    if (user.profile?.institution) completionScore++;
    if (user.profile?.position) completionScore++;
    if (user.profile?.address) completionScore++;
    if (user.profile?.avatarUrl) completionScore++;
    if (experiences > 0) completionScore++;
    if (skills > 0) completionScore++;
    if (subjects > 0) completionScore++;

    const completionPercentage = Math.round((completionScore / totalFields) * 100);

    // Get missing fields
    const missingFields: string[] = [];
    if (!user.name || user.name.trim().length === 0) missingFields.push('Nama Lengkap');
    if (!user.profile?.phone) missingFields.push('Nomor Telepon');
    if (!user.profile?.institution) missingFields.push('Institusi');
    if (!user.profile?.position) missingFields.push('Jabatan');
    if (!user.profile?.address) missingFields.push('Alamat');
    if (!user.profile?.avatarUrl) missingFields.push('Foto Profil');
    if (experiences === 0) missingFields.push('Pengalaman Kerja');
    if (skills === 0) missingFields.push('Keahlian');
    if (subjects === 0) missingFields.push('Mata Pelajaran');

    return {
      percentage: completionPercentage,
      completed: completionScore,
      total: totalFields,
      missingFields,
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