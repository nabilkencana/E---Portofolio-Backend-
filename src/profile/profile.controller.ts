// src/profile/profile.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTeacherDetailDto } from './dto/update-teacher-detail.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get complete user profile' })
  async getProfile(@CurrentUser() user: any) {
    return await this.profileService.getCompleteProfile(user.id);
  }

  @Put('basic')
  @ApiOperation({ summary: 'Update basic profile information' })
  async updateBasicProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.profileService.updateBasicProfile(user.id, dto);
  }

  @Put('teacher-details')
  @ApiOperation({ summary: 'Update teacher details' })
  async updateTeacherDetails(
    @CurrentUser() user: any,
    @Body() dto: UpdateTeacherDetailDto,
  ) {
    return await this.profileService.updateTeacherDetails(user.id, dto);
  }

  @Put('avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
        ],
      }),
    )
    avatar: Express.Multer.File,
  ) {
    return await this.profileService.uploadAvatar(user.id, avatar);
  }

  @Get('schools')
  @ApiOperation({ summary: 'Get list of schools' })
  async getSchools() {
    return await this.profileService.getSchools();
  }

  @Get('completion')
  @ApiOperation({ summary: 'Get profile completion percentage' })
  async getProfileCompletion(@CurrentUser() user: any) {
    return await this.profileService.getProfileCompletion(user.id);
  }
}