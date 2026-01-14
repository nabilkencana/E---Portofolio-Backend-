import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import express from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PortfolioService } from './portofolio.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@ApiTags('Portfolio')
@ApiBearerAuth()
@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) { }

  @Get('preview')
  @ApiOperation({ summary: 'Preview portfolio as PDF' })
  @ApiResponse({ status: 200, description: 'PDF preview generated' })
  async previewPortfolio(
    @CurrentUser() user: any,
    @Res() res: express.Response
  ) {
    try {
      await this.portfolioService.generatePDF(user.id, res);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      res.status(500).json({ message: 'Failed to generate PDF preview' });
    }
  }

  @Get('download')
  @ApiOperation({ summary: 'Download portfolio as PDF' })
  @ApiResponse({ status: 200, description: 'PDF download started' })
  async downloadPortfolio(
    @CurrentUser() user: any,
    @Res() res: express.Response
  ) {
    try {
      await this.portfolioService.generatePDFForDownload(user.id, res);
    } catch (error) {
      console.error('Error generating PDF for download:', error);
      res.status(500).json({ message: 'Failed to generate PDF for download' });
    }
  }

  @Get('data')
  @ApiOperation({ summary: 'Get portfolio data for frontend' })
  @ApiResponse({ status: 200, description: 'Portfolio data retrieved' })
  async getPortfolioData(@CurrentUser() user: any) {
    try {
      const data = await this.portfolioService.getPortfolioData(user.id);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error getting portfolio data:', error);
      return {
        success: false,
        message: 'Failed to get portfolio data',
      };
    }
  }
}