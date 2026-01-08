// src/school/school.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SchoolService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async getSchools(query: {
        province?: string;
        city?: string;
        schoolType?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const {
            province,
            city,
            schoolType,
            search,
            page = 1,
            limit = 20,
        } = query;

        const skip = (page - 1) * limit;

        const where: any = {};

        if (province) where.province = { contains: province, mode: 'insensitive' };
        if (city) where.city = { contains: city, mode: 'insensitive' };
        if (schoolType) where.schoolType = schoolType;
        if (search) {
            where.OR = [
                { schoolName: { contains: search, mode: 'insensitive' } },
                { npsn: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [schools, total] = await Promise.all([
            this.prisma.school.findMany({
                where,
                select: {
                    id: true,
                    npsn: true,
                    schoolName: true,
                    schoolType: true,
                    schoolLevel: true,
                    address: true,
                    village: true,
                    subdistrict: true,
                    city: true,
                    province: true,
                    accreditation: true,
                },
                orderBy: { schoolName: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.school.count({ where }),
        ]);

        return {
            data: schools,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getProvinces() {
        const provinces = await this.prisma.school.findMany({
            select: {
                province: true,
            },
            distinct: ['province'],
            where: {
                province: {
                    not: null,
                },
            },
            orderBy: {
                province: 'asc',
            },
        });

        return provinces
            .map(p => p.province)
            .filter((province): province is string => province !== null)
            .sort();
    }

    async getCities(province?: string) {
        const where: any = {};
        if (province) {
            where.province = province;
        }

        const cities = await this.prisma.school.findMany({
            select: {
                city: true,
                province: true,
            },
            distinct: ['city'],
            where: {
                city: {
                    not: null,
                },
                ...where,
            },
            orderBy: {
                city: 'asc',
            },
        });

        return cities
            .map(c => c.city)
            .filter((city): city is string => city !== null)
            .sort();
    }

    async getSchoolTypes() {
        const types = await this.prisma.school.findMany({
            select: {
                schoolType: true,
            },
            distinct: ['schoolType'],
            orderBy: {
                schoolType: 'asc',
            },
        });

        return types.map(t => t.schoolType).sort();
    }

    async getSchoolById(id: string) {
        const school = await this.prisma.school.findUnique({
            where: { id },
        });

        if (!school) {
            throw new BadRequestException('Sekolah tidak ditemukan');
        }

        return school;
    }

    async searchSchools(search: string) {
        return this.prisma.school.findMany({
            where: {
                OR: [
                    { schoolName: { contains: search, mode: 'insensitive' } },
                    { npsn: { contains: search, mode: 'insensitive' } },
                    { address: { contains: search, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                npsn: true,
                schoolName: true,
                schoolType: true,
                city: true,
                province: true,
                address: true,
            },
            take: 50,
            orderBy: { schoolName: 'asc' },
        });
    }

    async importSchoolsFromAPI() {
        // Implementasi import data sekolah dari API pemerintah
        // Contoh: https://data.go.id/dataset/data-sekolah
        // Note: Perlu API key dan permission

        console.log('Importing schools from API...');
        // Placeholder - implement sesuai API yang tersedia
        return { message: 'Import feature not yet implemented' };
    }

    async createSchool(data: {
        npsn?: string;
        schoolName: string;
        schoolType: string;
        schoolLevel?: string;
        address?: string;
        village?: string;
        subdistrict?: string;
        city?: string;
        province?: string;
        postalCode?: string;
        phone?: string;
        email?: string;
        website?: string;
        accreditation?: string;
        latitude?: number;
        longitude?: number;
    }) {
        return this.prisma.school.create({
            data,
        });
    }
}