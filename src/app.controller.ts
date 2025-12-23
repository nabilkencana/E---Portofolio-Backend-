// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello(): {
    message: string;
    docs: string;
    health: string;
  } {
    return {
      message: 'E-Portfolio API is running 🚀',
      docs: '/api-docs',
      health: '/health'  // Ubah dari '/api/health' ke '/health'
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }
}