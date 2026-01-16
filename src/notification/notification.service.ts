// notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  Notification,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Create a new notification
   */
  async create(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          title: createNotificationDto.title,
          message: createNotificationDto.message,
          type: createNotificationDto.type || NotificationType.SYSTEM,
          relatedId: createNotificationDto.relatedId,
          relatedType: createNotificationDto.relatedType,
          link: createNotificationDto.link,
          metadata: createNotificationDto.metadata,
          status: NotificationStatus.UNREAD,
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

      this.logger.log(`Notification created for user ${userId}: ${notification.id}`);
      return notification;
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: NotificationStatus,
    type?: NotificationType,
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.NotificationWhereInput = { userId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Jangan tampilkan notifikasi yang expired
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
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
      this.prisma.notification.count({ where }),
      this.getUnreadCount(userId),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  /**
   * Get notification by ID
   */
  async findOne(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
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

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this notification');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    // Check if notification exists and belongs to user
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this notification');
    }

    // Update status to READ
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    this.logger.log(`Notification ${id} marked as read by user ${userId}`);
    return updated;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    this.logger.log(`All notifications marked as read for user ${userId}: ${result.count} updated`);
    return { count: result.count };
  }

  /**
   * Archive notification
   */
  async archive(id: string, userId: string): Promise<Notification> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    });

    this.logger.log(`Notification ${id} archived by user ${userId}`);
    return updated;
  }

  /**
   * Delete notification
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    this.logger.log(`Notification ${id} deleted by user ${userId}`);
    return { message: 'Notification deleted successfully' };
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return count;
  }

  /**
   * Create achievement validation notification
   */
  async createAchievementValidationNotification(
    userId: string,
    achievementId: string,
    achievementTitle: string,
    status: string,
    adminName?: string,
  ): Promise<Notification> {
    const messages = {
      APPROVED: `Prestasi "${achievementTitle}" telah disetujui${adminName ? ` oleh ${adminName}` : ''}.`,
      REJECTED: `Prestasi "${achievementTitle}" ditolak. Silakan cek catatan revisi.`,
      REVISION: `Prestasi "${achievementTitle}" memerlukan revisi. Silakan perbaiki sesuai catatan.`,
    };

    const typeMap = {
      APPROVED: NotificationType.ACHIEVEMENT,
      REJECTED: NotificationType.ALERT,
      REVISION: NotificationType.VALIDATION,
    };

    const createNotificationDto: CreateNotificationDto = {
      title: `Update Status Prestasi: ${status}`,
      message: messages[status] || `Prestasi "${achievementTitle}" telah diupdate.`,
      type: typeMap[status] || NotificationType.SYSTEM,
      relatedId: achievementId,
      relatedType: 'achievement',
      link: `/achievements/${achievementId}`,
      metadata: {
        achievementId,
        achievementTitle,
        status,
        validatedBy: adminName,
        validatedAt: new Date().toISOString(),
      },
    };

    return this.create(userId, createNotificationDto);
  }

  /**
   * Create achievement submission notification for admin
   */
  async createAchievementSubmissionNotification(
    userId: string,
    achievementId: string,
    achievementTitle: string,
    userName: string,
  ): Promise<Notification> {
    // Cari admin users
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
      select: {
        id: true,
      },
    });

    // Buat notifikasi untuk setiap admin
    const notifications = await Promise.all(
      admins.map(async (admin) => {
        const createNotificationDto: CreateNotificationDto = {
          title: `Prestasi Baru Menunggu Validasi`,
          message: `User ${userName} telah mengajukan prestasi baru: "${achievementTitle}"`,
          type: NotificationType.VALIDATION,
          relatedId: achievementId,
          relatedType: 'achievement',
          link: `/admin/achievements/${achievementId}`,
          metadata: {
            achievementId,
            achievementTitle,
            submittedBy: userName,
            submittedByUserId: userId,
            submittedAt: new Date().toISOString(),
          },
        };

        return this.create(admin.id, createNotificationDto);
      }),
    );

    return notifications[0]; // Return first notification as reference
  }

  /**
   * Create profile completion reminder
   */
  // Di notifications.service.ts, perbaiki method createProfileCompletionReminder:
  async createProfileCompletionReminder(
    userId: string,
    missingFields: string[],
  ): Promise<Notification> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 hari dari sekarang

    return this.create(userId, {
      title: 'Lengkapi Profil Anda',
      message: `Profil Anda masih belum lengkap. Mohon lengkapi: ${missingFields.join(', ')}`,
      type: 'REMINDER',
      relatedType: 'profile',
      link: '/profile',
      expiresAt, // Gunakan expiresAt
      metadata: {
        missingFields,
        reminderType: 'profile_completion',
      },
    });
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<{ deletedCount: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired notifications`);
    return { deletedCount: result.count };
  }

  /**
   * Get latest notifications (for dashboard)
   */
  async getRecentNotifications(userId: string, limit: number = 5) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
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
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  }

  /**
  * Get dashboard notifications summary
  */
  async getDashboardSummary(userId: string) {
    const [unreadCount, recentNotifications] = await Promise.all([
      this.getUnreadCount(userId),
      this.getRecentNotifications(userId, 5),
    ]);

    // Hitung notifikasi berdasarkan type untuk badge warna berbeda
    const byType = await this.prisma.notification.groupBy({
      by: ['type'],
      where: {
        userId,
        status: NotificationStatus.UNREAD,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      _count: {
        id: true,
      },
    });

    const badges = {
      achievement: byType.find(n => n.type === 'ACHIEVEMENT')?._count?.id || 0,
      validation: byType.find(n => n.type === 'VALIDATION')?._count?.id || 0,
      alert: byType.find(n => n.type === 'ALERT')?._count?.id || 0,
      system: byType.find(n => n.type === 'SYSTEM')?._count?.id || 0,
      reminder: byType.find(n => n.type === 'REMINDER')?._count?.id || 0,
      total: unreadCount,
    };

    return {
      unreadCount,
      badges,
      recentNotifications,
      summary: `Anda memiliki ${unreadCount} notifikasi belum dibaca`,
      hasNewAchievements: badges.achievement > 0,
      hasPendingValidations: badges.validation > 0,
    };
  }
}