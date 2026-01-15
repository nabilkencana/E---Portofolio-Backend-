import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
    private supabase: SupabaseService,
  ) { }

  async getUserSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parse preferences dari JSON string atau gunakan default
    const preferences = user.profile ? await this.parsePreferences(user.profile) : {
      emailNotifications: true,
      pushNotifications: true,
      darkMode: false,
      newsletter: false,
      marketingEmails: false,
      twoFactorAuth: false,
      language: 'id',
      timezone: 'Asia/Jakarta',
    };

    // Get session info
    const sessionInfo = await this.getSessionInfo(userId);

    // Get user info from Supabase untuk data tambahan
    const supabaseUser = await this.getSupabaseUser(userId);

    return {
      profile: {
        id: user.id,
        full_name: user.profile?.name || user.name || '',
        avatar_url: user.profile?.avatarUrl || supabaseUser?.user_metadata?.avatar_url || '',
        phone: user.profile?.phone || '',
        bio: '', // Tidak ada di schema, tambahkan jika perlu
        website: '', // Tidak ada di schema, tambahkan jika perlu
        location: '', // Tidak ada di schema, tambahkan jika perlu
        language: preferences.language || 'id',
        theme: preferences.darkMode ? 'dark' : 'light',
      },
      preferences,
      security: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
      sessionInfo,
    };
  }

  private async parsePreferences(profile: any): Promise<any> {
    try {
      // Coba parse dari JSON string atau langsung dari object
      if (typeof profile.preferences === 'string') {
        return JSON.parse(profile.preferences);
      }
      return profile.preferences || {};
    } catch (error) {
      return {};
    }
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user name jika berbeda
    if (dto.full_name !== user.name) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: dto.full_name },
      });
    }

    // Update atau create profile dengan data yang ada di schema
    if (user.profile) {
      return await this.prisma.profile.update({
        where: { userId },
        data: {
          name: dto.full_name,
          phone: dto.phone,
          // Simpan bio, website, location sebagai JSON di preferences
          preferences: {
            ...(await this.parsePreferences(user.profile)),
            bio: dto.bio,
            website: dto.website,
            location: dto.location,
          },
          updatedAt: new Date(),
        },
      });
    } else {
      return await this.prisma.profile.create({
        data: {
          userId,
          name: dto.full_name,
          phone: dto.phone,
          email: user.email,
          preferences: {
            bio: dto.bio,
            website: dto.website,
            location: dto.location,
          },
        },
      });
    }
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPreferences = user.profile ? await this.parsePreferences(user.profile) : {};
    const updatedPreferences = { ...currentPreferences, ...dto };

    // Apply theme changes
    if (dto.darkMode !== undefined) {
      updatedPreferences.theme = dto.darkMode ? 'dark' : 'light';
    }

    if (user.profile) {
      return await this.prisma.profile.update({
        where: { userId },
        data: {
          preferences: updatedPreferences,
          updatedAt: new Date(),
        },
      });
    } else {
      return await this.prisma.profile.create({
        data: {
          userId,
          email: user.email,
          preferences: updatedPreferences,
        },
      });
    }
  }

  async updateSecurity(userId: string, dto: UpdateSecurityDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password baru tidak cocok');
    }

    if (dto.newPassword.length < 6) {
      throw new BadRequestException('Password minimal 6 karakter');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.supabaseId) {
      throw new BadRequestException('Supabase user ID tidak ditemukan');
    }

    try {
      const client = this.supabase.getClient();

      await client.auth.admin.updateUserById(user.supabaseId, {
        password: dto.newPassword,
      });

      console.log('User from DB:', user);

      return { message: 'Password berhasil diperbarui' };
    } catch (error) {
      console.error('Error updating password:', error);
      throw new BadRequestException(
        error?.message || 'Gagal memperbarui password'
      );
    }
  }


  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Validate file
    if (!file?.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Hanya file gambar yang diizinkan');
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      throw new BadRequestException('Ukuran gambar maksimal 2MB');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await this.cloudinary.uploadAvatar(
        file,
        'e-portofolio/avatars',
      );

      const avatarUrl = uploadResult.secure_url;

      // Delete old avatar if exists
      if (user.profile?.avatarUrl) {
        try {
          const oldUrlParts = user.profile.avatarUrl.split('/');
          const oldPublicId = oldUrlParts.slice(-2).join('/').split('.')[0];
          await this.cloudinary.deleteFile(oldPublicId);
        } catch (error) {
          console.error('Failed to delete old avatar:', error);
        }
      }

      // Update database
      if (user.profile) {
        await this.prisma.profile.update({
          where: { userId },
          data: { avatarUrl },
        });
      } else {
        await this.prisma.profile.create({
          data: {
            userId,
            email: user.email,
            avatarUrl,
          },
        });
      }

      return {
        message: 'Foto profil berhasil diperbarui',
        avatarUrl,
      };
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new BadRequestException('Gagal mengunggah foto profil');
    }
  }

  async deleteAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile?.avatarUrl) {
      throw new BadRequestException('Tidak ada avatar untuk dihapus');
    }

    try {
      // Delete from Cloudinary
      const oldUrlParts = user.profile.avatarUrl.split('/');
      const oldPublicId = oldUrlParts.slice(-2).join('/').split('.')[0];
      await this.cloudinary.deleteFile(oldPublicId);

      // Update database
      await this.prisma.profile.update({
        where: { userId },
        data: { avatarUrl: null },
      });

      return { message: 'Avatar berhasil dihapus' };
    } catch (error) {
      console.error('Error deleting avatar:', error);
      throw new BadRequestException('Gagal menghapus avatar');
    }
  }

  async getSessionInfo(userId: string) {
    try {
      // For now, return simulated session data
      // In production, you would fetch from Supabase sessions
      return {
        lastLogin: new Date().toLocaleString('id-ID'),
        device: this.getDeviceInfo(),
        ipAddress: '192.168.1.1',
      };
    } catch (error) {
      console.error('Error fetching session info:', error);
      return {
        lastLogin: new Date().toLocaleString('id-ID'),
        device: 'Unknown',
        ipAddress: 'Unknown',
      };
    }
  }

  private getDeviceInfo(): string {
    // Simulate device detection
    return 'Desktop (Chrome/Windows)';
  }

  private async getSupabaseUser(userId: string) {
    try {
      const client = this.supabase.getClient();
      if (!client) return null;

      const { data, error } = await client.auth.admin.getUserById(userId);
      if (error) return null;

      return data.user;
    } catch (error) {
      console.error('Error fetching supabase user:', error);
      return null;
    }
  }

  async terminateAllSessions(userId: string) {
    try {
      // Revoke all refresh tokens
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          refreshToken: null,
          refreshTokenExp: null,
        },
      });

      // In production, you might want to call Supabase API to revoke all sessions
      return { message: 'Semua sesi telah diakhiri' };
    } catch (error) {
      console.error('Error terminating sessions:', error);
      throw new BadRequestException('Gagal mengakhiri sesi');
    }
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // First, try to delete from Supabase Auth
      const client = this.supabase.getClient();
      if (client) {
        const { error } = await client.auth.admin.deleteUser(userId);
        if (error) {
          console.warn('Supabase user deletion failed, continuing with local delete:', error);
        }
      }

      // Delete from local database (cascade will handle related records)
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return { message: 'Akun berhasil dihapus' };
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new BadRequestException('Gagal menghapus akun');
    }
  }
}