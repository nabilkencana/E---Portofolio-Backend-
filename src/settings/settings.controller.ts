import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Delete,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AvatarUploadDto } from './dto/avatar-upload.dto';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  @ApiOperation({ summary: 'Get all user settings' })
  async getSettings(@CurrentUser() user: any) {
    return await this.settingsService.getUserSettings(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile settings' })
  async getProfileSettings(@CurrentUser() user: any) {
    const settings = await this.settingsService.getUserSettings(user.id);
    return settings.profile;
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return await this.settingsService.updateProfile(user.id, dto);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@CurrentUser() user: any) {
    const settings = await this.settingsService.getUserSettings(user.id);
    return settings.preferences;
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return await this.settingsService.updatePreferences(user.id, dto);
  }

  @Put('security/password')
  @ApiOperation({ summary: 'Update password' })
  async updateSecurity(
    @CurrentUser() user: any,
    @Body() dto: UpdateSecurityDto,
  ) {
    return await this.settingsService.updateSecurity(user.id, dto);
  }

  @Put('avatar')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: AvatarUploadDto })
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return await this.settingsService.uploadAvatar(user.id, avatar);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Delete profile avatar' })
  async deleteAvatar(@CurrentUser() user: any) {
    // Panggil method khusus untuk delete avatar
    return await this.settingsService.deleteAvatar(user.id);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: any) {
    return await this.settingsService.getSessionInfo(user.id);
  }

  @Post('sessions/terminate-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Terminate all sessions except current' })
  async terminateAllSessions(@CurrentUser() user: any) {
    return await this.settingsService.terminateAllSessions(user.id);
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@CurrentUser() user: any) {
    return await this.settingsService.deleteAccount(user.id);
  }

  @Put('theme')
  @ApiOperation({ summary: 'Update theme preference' })
  async updateTheme(
    @CurrentUser() user: any,
    @Body() body: { theme: 'light' | 'dark' },
  ) {
    const dto: UpdatePreferencesDto = {
      darkMode: body.theme === 'dark',
    };
    return await this.settingsService.updatePreferences(user.id, dto);
  }
}