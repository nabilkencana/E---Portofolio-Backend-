// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

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