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

    // Count validated achievements - gunakan validationStatus bukan status
    const validatedAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        validationStatus: 'APPROVED',
      },
    });

    // Count pending achievements - gunakan validationStatus bukan status
    const pendingAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        validationStatus: 'PENDING',
      },
    });

    // Count rejected achievements - gunakan validationStatus bukan status
    const rejectedAchievements = await this.prisma.achievement.count({
      where: {
        userId,
        validationStatus: 'REJECTED',
      },
    });

    // Count prestasi vs sertifikat
    const prestasiCount = await this.prisma.achievement.count({
      where: {
        userId,
        type: 'prestasi',
      },
    });

    const sertifikatCount = await this.prisma.achievement.count({
      where: {
        userId,
        type: 'sertifikat',
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
      prestasiCount,
      sertifikatCount,
      validationPercentage,
      recentAdditions,
    };
  }

  async getRecentAchievements(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      // Tidak perlu include category karena tidak ada relasi langsung
      // Jika ada relasi Category, sesuaikan dengan schema yang ada
    });

    return achievements.map(achievement => ({
      id: achievement.id,
      title: achievement.title,
      // Gunakan type langsung dari achievement, bukan dari category
      type: achievement.type === 'sertifikat' ? 'Sertifikat' : 'Prestasi',
      status: achievement.validationStatus, // Gunakan validationStatus
      date: achievement.createdAt.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      year: achievement.year,
      level: this.getLevelLabel(achievement.level),
      description: achievement.description,
      hasAttachment: !!achievement.proofFilePath, // Gunakan proofFilePath untuk cek attachment
      validationStatus: achievement.validationStatus,
    }));
  }

  // Helper method untuk mengubah level ke label
  private getLevelLabel(level: string | null): string {
    if (!level) return '-';

    const levelMap: Record<string, string> = {
      'sekolah': 'Tingkat Sekolah',
      'kecamatan': 'Tingkat Kecamatan',
      'kabupaten': 'Tingkat Kabupaten/Kota',
      'provinsi': 'Tingkat Provinsi',
      'nasional': 'Tingkat Nasional',
      'internasional': 'Tingkat Internasional',
    };

    return levelMap[level] || level;
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
        achievements: {
          take: 1, // Cek apakah ada achievement
        },
      },
    });

    if (!user || !user.profile) {
      return {
        percentage: 0,
        completed: 0,
        total: 12,
        missingFields: [],
      };
    }

    let completionScore = 0;
    const totalFields = 12; // Total fields to check

    // Basic profile info
    if (user.profile.name) completionScore++;
    if (user.profile.nip) completionScore++;
    if (user.profile.phone) completionScore++;
    if (user.profile.schoolId) completionScore++;
    if (user.profile.avatarUrl) completionScore++;
    if (user.profile.address) completionScore++;

    // Teacher details
    const teacherDetail = user.teacher_detail;
    if (teacherDetail?.subjectTaught) completionScore++;
    if (teacherDetail?.competencies) completionScore++;
    if (teacherDetail?.educationLevel) completionScore++;
    if (teacherDetail?.yearsOfExperience) completionScore++;

    // Additional info (minimal ada 1 data)
    if (user.educations.length > 0) completionScore++;
    if (user.experiences.length > 0) completionScore++;
    if (user.skills.length > 0) completionScore++;
    if (user.subjects.length > 0) completionScore++;
    if (user.achievements.length > 0) completionScore++;

    const completionPercentage = Math.round((completionScore / totalFields) * 100);

    // Get missing fields
    const missingFields: string[] = [];
    if (!user.profile.name) missingFields.push('Nama Lengkap');
    if (!user.profile.nip) missingFields.push('NIP');
    if (!user.profile.phone) missingFields.push('Nomor Telepon');
    if (!user.profile.schoolId) missingFields.push('Sekolah');
    if (!user.profile.avatarUrl) missingFields.push('Foto Profil');
    if (!user.profile.address) missingFields.push('Alamat');
    if (!teacherDetail?.subjectTaught) missingFields.push('Mata Pelajaran');
    if (!teacherDetail?.competencies) missingFields.push('Kompetensi');
    if (!teacherDetail?.educationLevel) missingFields.push('Tingkat Pendidikan');
    if (!teacherDetail?.yearsOfExperience) missingFields.push('Pengalaman Mengajar');
    if (user.educations.length === 0) missingFields.push('Riwayat Pendidikan');
    if (user.experiences.length === 0) missingFields.push('Pengalaman Kerja');
    if (user.skills.length === 0) missingFields.push('Keahlian');
    if (user.subjects.length === 0) missingFields.push('Mata Pelajaran yang Diajarkan');
    if (user.achievements.length === 0) missingFields.push('Prestasi/Sertifikat');

    return {
      percentage: completionPercentage,
      completed: completionScore,
      total: totalFields,
      missingFields: missingFields.slice(0, 5), // Tampilkan maksimal 5 field yang missing
    };
  }

  async getAchievementsByLevel(userId: string) {
    const achievements = await this.prisma.achievement.groupBy({
      by: ['level'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // Transform data untuk chart
    return achievements.map(item => ({
      level: this.getLevelLabel(item.level),
      count: item._count.id,
      levelValue: item.level,
    }));
  }

  async getAchievementsByYear(userId: string) {
    const achievements = await this.prisma.achievement.groupBy({
      by: ['year'],
      where: {
        userId,
        year: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        year: 'desc',
      },
      take: 5,
    });

    return achievements.map(item => ({
      year: item.year,
      count: item._count.id,
    }));
  }

  async getDashboardSummary(userId: string) {
    const [stats, recentAchievements, profileCompletion, achievementsByLevel, achievementsByYear] = await Promise.all([
      this.getStats(userId),
      this.getRecentAchievements(userId),
      this.getProfileCompletion(userId),
      this.getAchievementsByLevel(userId),
      this.getAchievementsByYear(userId),
    ]);

    return {
      stats: {
        ...stats,
        // Hitung persentase prestasi vs sertifikat
        prestasiPercentage: stats.totalAchievements > 0
          ? Math.round((stats.prestasiCount / stats.totalAchievements) * 100)
          : 0,
        sertifikatPercentage: stats.totalAchievements > 0
          ? Math.round((stats.sertifikatCount / stats.totalAchievements) * 100)
          : 0,
      },
      recentAchievements,
      profileCompletion,
      charts: {
        achievementsByLevel,
        achievementsByYear,
      },
    };
  }
}