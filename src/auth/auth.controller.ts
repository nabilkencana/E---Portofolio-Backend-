// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Response, Request } from 'express';
import { UserEntity } from './entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Registrasi pengguna baru' })
  @ApiResponse({
    status: 201,
    description: 'Registrasi berhasil',
    schema: {
      example: {
        message: 'Registrasi berhasil! Silakan login.',
        user: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Email sudah terdaftar',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email sudah terdaftar',
        error: 'Conflict'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Data tidak valid',
    schema: {
      example: {
        statusCode: 400,
        message: [
          {
            property: 'email',
            message: 'Format email tidak valid'
          }
        ],
        error: 'Bad Request'
      }
    }
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authData = await this.authService.register(dto);

    // Set refresh token as HTTP-only cookie
    response.cookie('refresh_token', authData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Registrasi berhasil! Silakan login.',
      user: authData.user,
      accessToken: authData.accessToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Login berhasil',
    schema: {
      example: {
        message: 'Login berhasil',
        user: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Kredensial tidak valid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Email atau password salah',
        error: 'Unauthorized'
      }
    }
  })
  
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authData = await this.authService.login(dto);

    // Set refresh token as HTTP-only cookie
    response.cookie('refresh_token', authData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      message: 'Login berhasil',
      user: authData.user,
      accessToken: authData.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Logout berhasil',
    schema: {
      example: {
        message: 'Logout berhasil'
      }
    }
  })
  async logout(
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.id);

    // Clear refresh token cookie
    response.clearCookie('refresh_token', {
      path: '/',
    });

    return {
      message: 'Logout berhasil',
    };
  }

  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token berhasil direfresh',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token tidak valid',
    schema: {
      example: {
        statusCode: 401,
        message: 'Refresh token tidak valid',
        error: 'Unauthorized'
      }
    }
  })
  async refresh(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refreshTokens(
      user.id,
      user.refreshToken,
    );

    // Update refresh token cookie
    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ubah password' })
  @ApiResponse({
    status: 200,
    description: 'Password berhasil diubah',
    schema: {
      example: {
        message: 'Password berhasil diubah',
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Password saat ini salah',
    schema: {
      example: {
        statusCode: 401,
        message: 'Password saat ini salah',
        error: 'Unauthorized'
      }
    }
  })
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.id, dto);

    return {
      message: 'Password berhasil diubah',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profil pengguna' })
  @ApiResponse({
    status: 200,
    description: 'Profil berhasil diambil',
    schema: {
      example: {
        message: 'Profil berhasil diambil',
        data: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      }
    }
  })
  async getProfile(@CurrentUser() user: UserEntity) {
    const profile = await this.authService.getProfile(user.id);
    return {
      message: 'Profil berhasil diambil',
      data: profile,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get data pengguna yang sedang login' })
  @ApiResponse({
    status: 200,
    description: 'Data berhasil diambil',
    schema: {
      example: {
        message: 'Data pengguna berhasil diambil',
        data: {
          id: 'uuid',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          emailVerified: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        }
      }
    }
  })
  async getCurrentUser(@CurrentUser() user: UserEntity) {
    // Get full user data with profile
    const fullUser = await this.authService.getProfile(user.id);
    return {
      message: 'Data pengguna berhasil diambil',
      data: user,
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifikasi email' })
  @ApiResponse({
    status: 200,
    description: 'Email berhasil diverifikasi',
    schema: {
      example: {
        message: 'Email berhasil diverifikasi',
      }
    }
  })
  async verifyEmail(@Body('token') token: string) {
    // Implement email verification logic
    return {
      message: 'Email berhasil diverifikasi',
    };
  }

  @Get('check')
  @ApiOperation({ summary: 'Check API status' })
  @ApiResponse({
    status: 200,
    description: 'API berjalan',
    schema: {
      example: {
        message: 'Auth API is running',
        timestamp: '2024-01-01T00:00:00.000Z',
      }
    }
  })
  check() {
    return {
      message: 'Auth API is running',
      timestamp: new Date().toISOString(),
    };
  }
}