// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) { }

  async register(dto: RegisterDto) {
    // Check if passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password tidak cocok');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('Format email tidak valid');
    }

    // Validate name
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BadRequestException('Nama minimal 2 karakter');
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(dto.password)) {
      throw new BadRequestException(
        'Password harus mengandung huruf besar, huruf kecil, dan angka (minimal 6 karakter)'
      );
    }

    try {
      // Check if user already exists - with retry
      const existingUser = await this.executeWithRetry(async () => {
        return await this.prisma.user.findUnique({
          where: { email: dto.email.toLowerCase().trim() },
        });
      }, 'findUnique');

      if (existingUser) {
        throw new ConflictException('Email sudah terdaftar');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // Create user in transaction
      const user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: dto.email.toLowerCase().trim(),
            name: dto.name.trim(),
            password: hashedPassword,
            emailVerified: true,
          },
        });

        // Create profile
        await tx.profile.create({
          data: {
            userId: newUser.id,
          },
        });
        return newUser;
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Save refresh token to database
      await this.executeWithRetry(async () => {
        await this.updateRefreshToken(user.id, tokens.refreshToken);
      }, 'updateRefreshToken');

      this.logger.log(`User registered: ${user.email}`);

      return {
        user: new UserEntity({ ...user, name: user.name ?? undefined }),
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Register error: ${error.message}`, error.stack);

      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Gagal mendaftarkan pengguna');
    }
  }

  async login(dto: LoginDto) {
    try {
      // Validate input
      if (!dto.email || !dto.password) {
        throw new BadRequestException('Email dan password diperlukan');
      }

      // Find user - with retry
      const user = await this.executeWithRetry(async () => {
        return await this.prisma.user.findUnique({
          where: { email: dto.email.toLowerCase().trim() },
        });
      }, 'findUniqueLogin');

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${dto.email}`);
        throw new UnauthorizedException('Email atau password salah');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(dto.password, user.password);

      if (!passwordValid) {
        this.logger.warn(`Invalid password for user: ${user.email}`);
        throw new UnauthorizedException('Email atau password salah');
      }

      if (!user.emailVerified) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Save refresh token to database
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      // Get user with profile for response
      const userWithProfile = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          profile: {
            include: {
              school: true,
            },
          },
          teacher_detail: true,
        },
      });

      if (!userWithProfile) {
        throw new UnauthorizedException('User data not found');
      }

      // Pada bagian login setelah mendapatkan userWithProfile
      const userData: Partial<UserEntity> = {
        id: userWithProfile.id,
        email: userWithProfile.email,
        name: userWithProfile.name,
        role: userWithProfile.role,
        emailVerified: userWithProfile.emailVerified,
        createdAt: userWithProfile.createdAt,
        updatedAt: userWithProfile.updatedAt,
        profile: userWithProfile.profile
          ? {
            id: userWithProfile.profile.id,
            userId: userWithProfile.profile.userId,
            name: userWithProfile.profile.name,
            nip: userWithProfile.profile.nip,
            email: userWithProfile.profile.email,
            phone: userWithProfile.profile.phone,
            schoolId: userWithProfile.profile.schoolId,
            avatarUrl: userWithProfile.profile.avatarUrl,
            address: userWithProfile.profile.address,
            createdAt: userWithProfile.profile.createdAt,
            updatedAt: userWithProfile.profile.updatedAt,
            school: userWithProfile.profile.school
              ? {
                id: userWithProfile.profile.school.id,
                schoolCode: userWithProfile.profile.school.schoolCode ?? '',
                schoolName: userWithProfile.profile.school.schoolName,
                schoolType: userWithProfile.profile.school.schoolType,
                address: userWithProfile.profile.school.address,
                city: userWithProfile.profile.school.city,
                province: userWithProfile.profile.school.province,
                postalCode: userWithProfile.profile.school.postalCode,
                phone: userWithProfile.profile.school.phone,
                email: userWithProfile.profile.school.email,
                createdAt: userWithProfile.profile.school.createdAt,
                updatedAt: userWithProfile.profile.school.updatedAt,
              }
              : undefined,
          }
          : undefined,
        teacherDetail: userWithProfile.teacher_detail ? {
          id: userWithProfile.teacher_detail.id,
          userId: userWithProfile.teacher_detail.userId,
          subjectTaught: userWithProfile.teacher_detail.subjectTaught,
          competencies: userWithProfile.teacher_detail.competencies,
          educationLevel: userWithProfile.teacher_detail.educationLevel,
          yearsOfExperience: userWithProfile.teacher_detail.yearsOfExperience,
          teachingCertificate: userWithProfile.teacher_detail.teachingCertificate,
          certificationNumber: userWithProfile.teacher_detail.certificationNumber,
          specialization: userWithProfile.teacher_detail.specialization,
          createdAt: userWithProfile.teacher_detail.createdAt,
          updatedAt: userWithProfile.teacher_detail.updatedAt,
        } : null,
      };

      return {
        user: new UserEntity(userData),
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Helper method for retry logic
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a prepared statement error
        const isPreparedStatementError =
          error.code === '42P05' ||
          error.message?.includes('prepared statement');

        if (isPreparedStatementError && attempt < maxRetries) {
          this.logger.warn(
            `Prepared statement error in ${operationName}, attempt ${attempt}/${maxRetries}: ${error.message}`
          );

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));

          // Try to reconnect
          try {
            await this.prisma.$disconnect();
            await this.prisma.$connect();
          } catch (reconnectError) {
            this.logger.error(`Reconnection failed: ${reconnectError.message}`);
          }

          continue;
        }

        // If not a prepared statement error or max retries reached, break
        break;
      }
    }

    throw lastError;
  }

  // Other methods remain the same...
  async logout(userId: string) {
    try {
      await this.executeWithRetry(async () => {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            refreshToken: null,
            refreshTokenExp: null,
          },
        });
      }, 'logout');

      this.logger.log(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error(`Logout error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Gagal logout');
    }
  }

  async refreshTokens(userId: string, refreshToken: string) {
    try {
      const user = await this.executeWithRetry(async () => {
        return await this.prisma.user.findUnique({
          where: { id: userId },
        });
      }, 'findUniqueRefresh');

      if (!user || !user.refreshToken || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token tidak valid');
      }

      if (!user.refreshTokenExp || user.refreshTokenExp < new Date()) {
        throw new UnauthorizedException('Refresh token telah kadaluarsa');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      await this.executeWithRetry(async () => {
        await this.updateRefreshToken(user.id, tokens.refreshToken);
      }, 'updateRefreshTokenRefresh');

      this.logger.log(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      this.logger.error(`Refresh token error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UnauthorizedException('Pengguna tidak ditemukan');
      }

      // Verify current password
      const passwordValid = await bcrypt.compare(dto.currentPassword, user.password);

      if (!passwordValid) {
        throw new UnauthorizedException('Password saat ini salah');
      }

      // Check if new password matches confirmation
      if (dto.newPassword !== dto.confirmPassword) {
        throw new BadRequestException('Password baru tidak cocok');
      }

      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(dto.newPassword)) {
        throw new BadRequestException(
          'Password harus mengandung huruf besar, huruf kecil, dan angka (minimal 6 karakter)'
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      });

      this.logger.log(`Password changed for user: ${user.email}`);

      return true;
    } catch (error) {
      this.logger.error(`Change password error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            school: true,
          },
        },
        teacher_detail: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    // Transform data untuk UserEntity
    const userData: Partial<UserEntity> = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile ? {
        id: user.profile.id,
        userId: user.profile.userId,
        name: user.profile.name,
        nip: user.profile.nip,
        email: user.profile.email,
        phone: user.profile.phone,
        schoolId: user.profile.schoolId,
        avatarUrl: user.profile.avatarUrl,
        address: user.profile.address,
        createdAt: user.profile.createdAt,
        updatedAt: user.profile.updatedAt,
        school: user.profile.school ? {
          id: user.profile.school.id,
          schoolCode: user.profile.school.schoolCode,
          schoolName: user.profile.school.schoolName,
          schoolType: user.profile.school.schoolType,
          address: user.profile.school.address,
          city: user.profile.school.city,
          province: user.profile.school.province,
          postalCode: user.profile.school.postalCode,
          phone: user.profile.school.phone,
          email: user.profile.school.email,
          createdAt: user.profile.school.createdAt,
          updatedAt: user.profile.school.updatedAt,
        } : undefined,
      } : undefined,
      teacherDetail: user.teacher_detail ? {
        id: user.teacher_detail.id,
        userId: user.teacher_detail.userId,
        subjectTaught: user.teacher_detail.subjectTaught,
        competencies: user.teacher_detail.competencies,
        educationLevel: user.teacher_detail.educationLevel,
        yearsOfExperience: user.teacher_detail.yearsOfExperience,
        teachingCertificate: user.teacher_detail.teachingCertificate,
        certificationNumber: user.teacher_detail.certificationNumber,
        specialization: user.teacher_detail.specialization,
        createdAt: user.teacher_detail.createdAt,
        updatedAt: user.teacher_detail.updatedAt,
      } : null,
    };

    return new UserEntity(userData);
  }

  // Helper methods
  private async generateTokens(userId: string, email: string, role: string) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          {
            sub: userId,
            email,
            role,
          },
          {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: this.config.get('JWT_EXPIRATION', '15m'),
          },
        ),
        this.jwtService.signAsync(
          {
            sub: userId,
            email,
            role,
          },
          {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
          },
        ),
      ]);

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Generate tokens error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Gagal membuat token');
    }
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const refreshTokenExp = new Date();
    refreshTokenExp.setDate(refreshTokenExp.getDate() + 7);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken,
        refreshTokenExp,
      },
    });
  }

  // Utility method for checking if email exists
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      return !!user;
    } catch (error) {
      this.logger.error(`Check email exists error: ${error.message}`, error.stack);
      return false;
    }
  }

  // Utility method for validating password strength
  validatePasswordStrength(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  }
}