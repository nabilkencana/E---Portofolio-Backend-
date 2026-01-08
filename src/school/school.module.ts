import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SchoolService } from './school.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [
        HttpModule, // ✅ WAJIB
    ],
    providers: [SchoolService, PrismaService],
    exports: [SchoolService],
})
export class SchoolModule { }
