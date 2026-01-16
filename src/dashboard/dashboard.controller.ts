import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@CurrentUser() user: any) {
    return await this.dashboardService.getStats(user.id);
  }

  @Get('recent-achievements')
  @ApiOperation({ summary: 'Get recent achievements' })
  async getRecentAchievements(@CurrentUser() user: any) {
    return await this.dashboardService.getRecentAchievements(user.id);
  }

  @Get('recent-notifications')
  @ApiOperation({ summary: 'Get recent notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit: number = 5,
  ) {
    return await this.dashboardService.getRecentNotifications(user.id, limit);
  }

  @Get('unread-notifications')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadNotificationsCount(@CurrentUser() user: any) {
    const stats = await this.dashboardService.getStats(user.id);
    return {
      unreadCount: stats.unreadNotifications,
    };
  }

  @Get('profile-completion')
  @ApiOperation({ summary: 'Get profile completion percentage' })
  async getProfileCompletion(@CurrentUser() user: any) {
    return await this.dashboardService.getProfileCompletion(user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get complete dashboard summary' })
  async getDashboardSummary(@CurrentUser() user: any) {
    return await this.dashboardService.getDashboardSummary(user.id);
  }
}