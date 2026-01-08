// src/school/school.controller.ts
import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
} from '@nestjs/common';
import { SchoolService } from './school.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Schools')
@Controller('schools')
export class SchoolController {
    constructor(private readonly schoolService: SchoolService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get schools with filtering and pagination' })
    @ApiQuery({ name: 'province', required: false })
    @ApiQuery({ name: 'city', required: false })
    @ApiQuery({ name: 'schoolType', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getSchools(
        @Query('province') province?: string,
        @Query('city') city?: string,
        @Query('schoolType') schoolType?: string,
        @Query('search') search?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.schoolService.getSchools({
            province,
            city,
            schoolType,
            search,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Get('provinces')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get list of provinces' })
    async getProvinces() {
        return this.schoolService.getProvinces();
    }

    @Get('cities')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get list of cities' })
    @ApiQuery({ name: 'province', required: false })
    async getCities(@Query('province') province?: string) {
        return this.schoolService.getCities(province);
    }

    @Get('types')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get list of school types' })
    async getSchoolTypes() {
        return this.schoolService.getSchoolTypes();
    }

    @Get('search')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Search schools by name or NPSN' })
    async searchSchools(@Query('q') search: string) {
        return this.schoolService.searchSchools(search);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get school by ID' })
    async getSchoolById(@Param('id') id: string) {
        return this.schoolService.getSchoolById(id);
    }
}